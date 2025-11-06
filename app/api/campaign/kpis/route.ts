// app/api/campaign/kpis/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

export async function GET() {
  const { companyId } = await requireCompanyScope();

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringSoon = await prisma.campaign.findMany({
    where: { companyId, status: "ACTIVE", endDate: { lte: soon, gte: now } },
    select: { id: true, name: true, endDate: true },
    orderBy: { endDate: "asc" },
    take: 10,
  });

  // Participación por equipo (agregada sobre campañas activas con scope=TEAMS)
  const activeTeams = await prisma.campaign.findMany({
    where: { companyId, status: "ACTIVE", scope: "TEAMS" },
    select: {
      id: true,
      targets: { select: { teamId: true } },
    },
  });

  const teamIds = [
    ...new Set(activeTeams.flatMap((c) => c.targets.map((t) => t.teamId))),
  ];

  const items: Array<{
    teamId: string;
    teamName: string;
    participation: number;
  }> = [];

  for (const teamId of teamIds) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, companyId },
      select: { id: true, name: true },
    });
    if (!team) continue;

    // miembros activos del team
    const members = await prisma.teamMembership.findMany({
      where: { teamId, user: { companyId, status: "ACTIVE" } },
      select: { userId: true },
    });
    const memberSet = new Set(members.map((m) => m.userId));
    const target = memberSet.size;

    // respuestas de campañas activas que incluyen este team
    const campIds = activeTeams
      .filter((c) => c.targets.some((t) => t.teamId === teamId))
      .map((c) => c.id);

    const resp = await prisma.surveyResponse.findMany({
      where: {
        campaignId: { in: campIds },
        userId: { in: Array.from(memberSet) },
      },
      select: { id: true },
    });
    const responded = resp.length;
    const pct = target > 0 ? Math.round((responded / target) * 100) : 0;

    items.push({ teamId, teamName: team.name, participation: pct });
  }

  // Orden por participación descendente (como para barras)
  items.sort((a, b) => b.participation - a.participation);

  return NextResponse.json({ expiringSoon, teamParticipation: items });
}
