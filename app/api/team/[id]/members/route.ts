// app/api/team/[id]/members/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { PublicError } from "@/lib/errors";
import { hasAnyPermission } from "@/lib/auth"; // <--- Importar
import { PERMISSIONS } from "@/config/roles"; // <--- Importar

/**
 * Devuelve info del team + lista de miembros (via TeamMembership)
 * Filtros: q (name/email/position/department)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Fix: params es Promise en Next 15
) {
  const { user, companyId } = await requireCompanyScope();
  const { id } = await params; // Await params

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const team = await prisma.team.findFirst({
    where: { id, companyId },
    select: {
      id: true,
      name: true,
      description: true,
      leadId: true,
      lead: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!team) throw new PublicError("Equipo no encontrado", 404);

  // --- CORRECCIÓN DE SEGURIDAD ---
  // Permitir acceso si:
  // 1. Es miembro del equipo
  // 2. O TIENE permisos globales de ver equipos (Admin/Manager)

  const hasGlobalAccess = hasAnyPermission(user, [
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.SYSTEM_COMPANIES_MANAGE,
  ]);

  if (!hasGlobalAccess) {
    const isMember = await prisma.teamMembership.findFirst({
      where: { teamId: team.id, userId: user.id },
      select: { id: true },
    });

    if (!isMember)
      throw new PublicError("No autorizado a ver este equipo", 403);
  }
  // -------------------------------

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
