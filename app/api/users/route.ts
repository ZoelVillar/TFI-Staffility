// app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasRole } from "@/lib/auth";
import { PublicError } from "@/lib/errors";
import bcrypt from "bcryptjs";

// GET: listar empleados (paginado lazy load)
export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  // if (!hasRole(user, "Manager")) throw new PublicError("No autorizado", 403);

  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "10"), 50);
  const cursor = searchParams.get("cursor");
  const filters = {
    name: searchParams.get("name") ?? undefined,
    email: searchParams.get("email") ?? undefined,
    phone: searchParams.get("phone") ?? undefined,
  };

  const where: any = {
    companyId,
    ...(filters.name
      ? { name: { contains: filters.name, mode: "insensitive" } }
      : {}),
    ...(filters.email
      ? { email: { contains: filters.email, mode: "insensitive" } }
      : {}),
    ...(filters.phone
      ? { phone: { contains: filters.phone, mode: "insensitive" } }
      : {}),
  };

  const employees = await prisma.user.findMany({
    where,
    take,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      image: true,
      phone: true,
      department: true,
      workMode: true,
      status: true,
      createdAt: true,
    },
  });

  const nextCursor =
    employees.length === take ? employees[employees.length - 1].id : null;
  const total = await prisma.user.count({ where });

  const kpis = {
    total,
    activos: await prisma.user.count({ where: { ...where, status: "ACTIVE" } }),
    inactivos: await prisma.user.count({
      where: { ...where, status: "INACTIVE" },
    }),
    remotos: await prisma.user.count({
      where: { ...where, workMode: "REMOTE" },
    }),
  };

  return NextResponse.json({ employees, nextCursor, kpis });
}

// POST: crear empleado (dentro del tenant del Manager)
function ensureEnum<T extends string>(
  value: any,
  allowed: readonly T[] | T[] | null | undefined
): T | null {
  if (!value) return null;
  const v = String(value).toUpperCase();
  return (allowed as string[]).includes(v) ? (v as T) : null;
}

const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "INTERN",
] as const;
const WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"] as const;
const SENIORITIES = ["JR", "SSR", "SR"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"] as const;

export async function POST(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  const body = await req.json();
  const {
    name,
    email,
    password,
    roleId, // requerido
    position,
    department,
    phone,
    image,
    workMode,
    employmentType,
    seniority,
    status, // opcional (default ACTIVE)
    managerId, // opcional: validar que pertenezca a la misma company
    locationCity,
    locationCountry,
    startDate, // ISO string
    endDate, // ISO string
    capacityHoursPerWeek,
    capacitySpPerWeek,
    hoursPerStoryPoint,
  } = body ?? {};

  // Validaciones mínimas
  if (!email || !password || !roleId) {
    throw new PublicError(
      "Faltan campos obligatorios: email, password, roleId",
      422
    );
  }

  // Normalizaciones / enums
  const _employmentType = ensureEnum(employmentType, EMPLOYMENT_TYPES);
  const _workMode = ensureEnum(workMode, WORK_MODES);
  const _seniority = ensureEnum(seniority, SENIORITIES);
  const _status = ensureEnum(status ?? "ACTIVE", STATUSES) ?? "ACTIVE";

  // Validar unicidad de email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new PublicError("Ya existe un usuario con ese email", 409);
  }

  // Validar roleId
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new PublicError("Rol inválido", 422);

  // (Opcional) Validar managerId (si vino) que sea del mismo tenant
  let _managerId: string | null = null;
  if (managerId) {
    const mgr = await prisma.user.findFirst({
      where: { id: String(managerId), companyId },
      select: { id: true },
    });
    if (!mgr)
      throw new PublicError(
        "managerId inválido (no pertenece a tu empresa)",
        422
      );
    _managerId = mgr.id;
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  const created = await prisma.user.create({
    data: {
      name: name ?? null,
      email,
      password: passwordHash,

      companyId, // siempre scoping al tenant del manager
      roleId,

      // Datos de empleado
      position: position ?? null,
      department: department ?? null,
      phone: phone ?? null,
      image: image ?? null,
      workMode: _workMode,
      employmentType: _employmentType,
      seniority: _seniority,
      status: _status,
      managerId: _managerId,
      locationCity: locationCity ?? null,
      locationCountry: locationCountry ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,

      // Capacidades (opcionales)
      capacityHoursPerWeek:
        typeof capacityHoursPerWeek === "number" ? capacityHoursPerWeek : null,
      capacitySpPerWeek:
        typeof capacitySpPerWeek === "number" ? capacitySpPerWeek : null,
      hoursPerStoryPoint:
        typeof hoursPerStoryPoint === "number" ? hoursPerStoryPoint : null,
    },
    select: { id: true },
  });

  return NextResponse.json({ created }, { status: 201 });
}
