// app/api/my-surveys/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

/** Obtiene los campaigns “target” del usuario: scope=ALL o scope=TEAMS ∧ miembro del team */
async function campaignsForUser(userId: string, companyId: string) {
  // campañas ALL
  const all = await prisma.campaign.findMany({
    where: { companyId, scope: "ALL" },
    orderBy: { createdAt: "desc" },
  });

  // campañas TEAMS donde participa al menos un team del usuario
  const myTeams = await prisma.teamMembership.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = myTeams.map((t) => t.teamId);

  const teamCamps =
    teamIds.length === 0
      ? []
      : await prisma.campaign.findMany({
          where: {
            companyId,
            scope: "TEAMS",
            targets: { some: { teamId: { in: teamIds } } },
          },
          orderBy: { createdAt: "desc" },
        });

  // Merge (podría haber duplicados si está en ALL y TEAMS; los unificamos por id)
  const map = new Map(all.concat(teamCamps).map((c) => [c.id, c]));
  return Array.from(map.values());
}

export async function GET() {
  const { user, companyId } = await requireCompanyScope();

  const camps = await campaignsForUser(user.id, companyId);

  const now = new Date();
  const responses = await prisma.surveyResponse.findMany({
    where: { userId: user.id, campaignId: { in: camps.map((c) => c.id) } },
    select: { campaignId: true, submittedAt: true },
  });
  const respondedSet = new Set(responses.map((r) => r.campaignId));

  const rows = camps.map((c) => {
    const isExpired = c.endDate < now || c.status === "CLOSED";
    const completed = respondedSet.has(c.id);

    let status: "PENDING" | "COMPLETED" | "EXPIRED" = "PENDING";
    if (completed) status = "COMPLETED";
    else if (isExpired) status = "EXPIRED";

    return {
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      statusCampaign: c.status, // ACTIVE|CLOSED
      myStatus: status, // PENDING|COMPLETED|EXPIRED
      createdAt: c.createdAt,
    };
  });

  return NextResponse.json({ items: rows });
}
