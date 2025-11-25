// app/api/my-surveys/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

// Helper reutilizable para saber si una campaña está activa
function getCampaignStatus(c: { status: string; endDate: Date }, hasResponse: boolean) {
  const now = new Date();
  // 1. Si ya respondió -> COMPLETED
  if (hasResponse) return "COMPLETED";
  // 2. Si está cerrada administrativamente o la fecha pasó -> EXPIRED
  if (c.status === "CLOSED" || new Date(c.endDate) < now) return "EXPIRED";
  // 3. Sino -> PENDING
  return "PENDING";
}

async function campaignsForUser(userId: string, companyId: string) {
  const all = await prisma.campaign.findMany({
    where: { companyId, scope: "ALL" },
    orderBy: { createdAt: "desc" },
  });

  const myTeams = await prisma.teamMembership.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = myTeams.map((t) => t.teamId);

  const teamCamps = teamIds.length === 0 ? [] : await prisma.campaign.findMany({
    where: {
      companyId,
      scope: "TEAMS",
      targets: { some: { teamId: { in: teamIds } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map(all.concat(teamCamps).map((c) => [c.id, c]));
  return Array.from(map.values());
}

export async function GET() {
  const { user, companyId } = await requireCompanyScope();
  const camps = await campaignsForUser(user.id, companyId);

  // Optimización: Traemos solo los IDs de las campañas respondidas
  const responses = await prisma.surveyResponse.findMany({
    where: { 
      userId: user.id, 
      campaignId: { in: camps.map((c) => c.id) } 
    },
    select: { campaignId: true },
  });
  
  const respondedSet = new Set(responses.map((r) => r.campaignId));

  const rows = camps.map((c) => {
    const hasResponse = respondedSet.has(c.id);
    const computedStatus = getCampaignStatus(c, hasResponse);

    return {
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      statusCampaign: c.status,
      myStatus: computedStatus, // <--- El servidor dicta el estado final
      createdAt: c.createdAt,
    };
  });

  // Ordenamiento: Pendientes primero, luego por fecha
  rows.sort((a, b) => {
    if (a.myStatus === 'PENDING' && b.myStatus !== 'PENDING') return -1;
    if (a.myStatus !== 'PENDING' && b.myStatus === 'PENDING') return 1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return NextResponse.json({ items: rows });
}