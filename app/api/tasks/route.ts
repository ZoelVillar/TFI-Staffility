// app/api/tasks/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import {
  resolveCapacityForUser,
  defaultHoursPerSPBySeniority,
} from "@/lib/workload";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";

// --- Funciones de utilidad (Preservadas) ---
function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toDateOrNull(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function toArrayOfStrings(v: unknown): string[] {
  if (Array.isArray(v))
    return v
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// --- GET Modificado ---
export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  const { searchParams } = new URL(req.url);

  // Parámetros de paginación y filtros básicos
  const take = Math.min(parseInt(searchParams.get("take") ?? "100"), 200);
  const cursor = searchParams.get("cursor") || undefined;
  
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const type = searchParams.get("type") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const tags = searchParams.getAll("tag");

  // Filtros nuevos (Team y Fechas)
  const teamId = searchParams.get("teamId") || undefined;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  // Lógica de Permisos:
  // Si pido teamId, debo tener permiso para ver equipos/usuarios.
  // Si no pido teamId, solo veo mis tareas (ownerId = user.id).
  const isManager = hasAnyPermission(user, [PERMISSIONS.TEAM_VIEW, PERMISSIONS.USERS_VIEW]);

  const where: any = {
    companyId,
    // Lógica crítica:
    // 1. Si hay teamId Y soy manager -> filtro por teamId (veo tareas de otros).
    // 2. Si NO hay teamId -> filtro por ownerId (solo mis tareas).
    ...(teamId && isManager ? { teamId } : { ownerId: user.id }),

    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(type ? { type } : {}),
    
    // Filtro de fechas (overlap logic mejorada)
    ...(from || to
      ? {
          OR: [
            // Tarea empieza dentro del rango
            { startDate: { gte: from, lte: to } },
            // Tarea termina dentro del rango
            { dueDate: { gte: from, lte: to } },
            // Tarea engloba el rango (empieza antes y termina después)
            { 
                AND: [
                    { startDate: { lte: from } },
                    { dueDate: { gte: to } }
                ]
            }
          ],
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(tags?.length ? { tags: { hasEvery: tags } } : {}),
  };

  const items = await prisma.task.findMany({
    where,
    take,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    // Si se filtra por fechas, ordenamos por inicio para timeline, si no, por creación
    orderBy: (from || to) ? { startDate: "asc" } : { createdAt: "desc" },
    include: {
      _count: {
        select: { comments: true },
      },
      // Incluimos owner para saber de quién es la tarea en vistas de equipo
      owner: {
        select: { id: true, name: true, image: true }
      }
    },
  });

  const nextCursor =
    items.length === take ? items[items.length - 1].id : null;

  const cleanItems = items.map((t) => ({
    ...t,
    commentCount: t._count.comments,
  }));

  return NextResponse.json({ items: cleanItems, nextCursor });
}

// --- POST (Preservado intacto) ---
export async function POST(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  const body = await req.json();

  // 1) Extraemos crudo del body
  const {
    title,
    description,
    type,
    priority,
    status,
    teamId,
    startDate,
    dueDate,
    estimateSp,
    estimateHours,
    progressPct,
    tags,
  } = body ?? {};

  if (!title || typeof title !== "string") {
    return new NextResponse("Falta título", { status: 400 });
  }

  // 2) Buscamos datos del user para derivar horas por SP si hace falta
  const dbUser = await prisma.user.findFirst({
    where: { id: user.id, companyId },
    select: {
      seniority: true,
      hoursPerStoryPoint: true,
    },
  });

  if (!dbUser) {
    return new NextResponse("Usuario no encontrado", { status: 404 });
  }

  const hPerSp =
    dbUser.hoursPerStoryPoint ??
    defaultHoursPerSPBySeniority(dbUser.seniority ?? undefined);

  // 3) Normalizamos números/fechas/arrays
  const estSp = toIntOrNull(estimateSp) ?? 0;
  let estHours = toIntOrNull(estimateHours);

  // si no vino un number válido, derivamos de SP
  if (estHours === null) {
    estHours = Math.max(0, Math.round(estSp * hPerSp));
  }

  const prog = toIntOrNull(progressPct) ?? 0;
  const start = toDateOrNull(startDate);
  const due = toDateOrNull(dueDate);
  const normalizedTags = toArrayOfStrings(tags);

  // 4) (Opcional) Validar enums simples para evitar 500 por Prisma
  const okStatus = ["PENDING", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELLED"];
  const okPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const okType = ["FEATURE", "BUG", "MAINTENANCE", "SUPPORT", "CHORE"];

  if (!okStatus.includes(status)) {
    return new NextResponse("Estado inválido", { status: 400 });
  }
  if (!okPriority.includes(priority)) {
    return new NextResponse("Prioridad inválida", { status: 400 });
  }
  if (!okType.includes(type)) {
    return new NextResponse("Tipo inválido", { status: 400 });
  }

  // 5) Crear
  const task = await prisma.task.create({
    data: {
      companyId,
      ownerId: user.id,
      teamId: teamId ?? null,
      title,
      description: description ?? null,
      type,
      priority,
      status,
      startDate: start,
      dueDate: due,
      estimateSp: estSp, // Int
      estimateHours: estHours, // Int
      progressPct: Math.min(100, Math.max(0, prog)),
      tags: normalizedTags,
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      startDate: true,
      dueDate: true,
      estimateSp: true,
      estimateHours: true,
      progressPct: true,
      tags: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ task });
}