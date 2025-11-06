import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { PublicError } from "@/lib/errors";

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
