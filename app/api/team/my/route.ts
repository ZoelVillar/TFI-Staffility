import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

/**
 * Devuelve los equipos donde el usuario actual es miembro (TeamMembership)
 * Filtros: q por nombre de team (contiene)
 * KPIs: totalTeams, totalMembers (suma miembros de cada team), teamsLead (donde es lead)
 */
export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  // memberships del user → teams
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: user.id, team: { companyId } },
    select: {
      team: {
        select: {
          id: true,
          name: true,
          description: true,
          leadId: true,
          lead: { select: { id: true, name: true, email: true, image: true } },
          _count: { select: { memberships: true } },
        },
      },
    },
  });

  let teams = memberships.map((m) => m.team);

  if (q) {
    const s = q.toLowerCase();
    teams = teams.filter((t) => t.name.toLowerCase().includes(s));
  }

  const kpis = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((a, t) => a + t._count.memberships, 0),
    teamsLead: teams.filter((t) => t.leadId === user.id).length,
  };

  return NextResponse.json({ teams, kpis });
}
