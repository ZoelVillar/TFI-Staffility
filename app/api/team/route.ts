import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { PublicError } from "@/lib/errors";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { z } from "zod";

/**
 * Devuelve info del team + lista de miembros (via TeamMembership)
 * Filtros: q (name/email/position/department)
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const team = await prisma.team.findFirst({
    where: { id: params.id, companyId },
    select: {
      id: true,
      name: true,
      description: true,
      leadId: true,
      lead: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!team) throw new PublicError("Equipo no encontrado", 404);

  // (opcional) exigir que el usuario sea miembro del team para ver los miembros:
  const isMember = await prisma.teamMembership.findFirst({
    where: { teamId: team.id, userId: user.id },
    select: { id: true },
  });
  if (!isMember) throw new PublicError("No autorizado a ver este equipo", 403);

  const memberships = await prisma.teamMembership.findMany({
    where: { teamId: team.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          position: true,
          department: true,
          seniority: true,
          status: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  let members = memberships.map((m) => m.user);

  if (q) {
    const s = q.toLowerCase();
    members = members.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.position ?? "").toLowerCase().includes(s) ||
        (u.department ?? "").toLowerCase().includes(s)
    );
  }

  return NextResponse.json({ team, members });
}

const createTeamSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  leadId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  // 1. Validación de Permisos (RBAC)
  if (!hasAnyPermission(user, [PERMISSIONS.TEAM_MANAGE, PERMISSIONS.SYSTEM_COMPANIES_MANAGE])) {
    return new NextResponse("No tienes permisos para crear equipos", { status: 403 });
  }

  const body = await req.json();
  
  // 2. Validación de Datos
  const validation = createTeamSchema.safeParse(body);
  if (!validation.success) {
    return new NextResponse(validation.error.errors[0].message, { status: 400 });
  }
  const { name, description, leadId } = validation.data;

  // 3. Validación de Unicidad (Nombre de equipo único por empresa)
  const existing = await prisma.team.findFirst({
    where: { companyId, name: { equals: name, mode: "insensitive" } }
  });

  if (existing) {
    return new NextResponse("Ya existe un equipo con este nombre en la empresa", { status: 409 });
  }

  // 4. Creación
  const newTeam = await prisma.team.create({
    data: {
      companyId,
      name,
      description: description || null,
      leadId: leadId || null,
    }
  });

  // Opcional: Si asignamos un líder, lo hacemos miembro automáticamente
  if (leadId) {
    await prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId: newTeam.id, userId: leadId } },
      create: { teamId: newTeam.id, userId: leadId, roleInTeam: "LEAD" },
      update: { roleInTeam: "LEAD" }
    });
  }

  return NextResponse.json({ team: newTeam }, { status: 201 });
}