// app/api/campaign/[id]/results/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

/** Helpers de permisos de visualización */
function canView(user: any) {
  // managers y admins: BURNOUT_VIEW o COMPANIES_MANAGE
  return (
    hasAnyPermission(user, [
      PERMISSIONS.BURNOUT_VIEW,
      PERMISSIONS.BURNOUT_MANAGE,
    ]) || hasAnyPermission(user, [PERMISSIONS.COMPANIES_MANAGE])
  );
}

async function getTargetUserIds(campId: string, companyId: string) {
  const camp = await prisma.campaign.findFirst({
    where: { id: campId, companyId },
    include: { targets: true },
  });
  if (!camp) return [];

  if (camp.scope === "ALL") {
    const users = await prisma.user.findMany({
      where: { companyId, status: "ACTIVE" },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  const teamIds = camp.targets.map((t) => t.teamId);
  if (teamIds.length === 0) return [];
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId: { in: teamIds }, user: { companyId, status: "ACTIVE" } },
    select: { userId: true },
  });
  return [...new Set(memberships.map((m) => m.userId))];
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  if (!canView(user)) throw new PublicError("No autorizado", 403);

  const camp = await prisma.campaign.findFirst({
    where: { id: params.id, companyId },
    include: {
      targets: {
        select: { teamId: true, team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!camp) throw new PublicError("Campaña no encontrada", 404);

  const targetUserIds = await getTargetUserIds(camp.id, companyId);
  const totalTarget = targetUserIds.length;

  // Respuestas globales
  const responses = await prisma.surveyResponse.findMany({
    where: { campaignId: camp.id },
    select: { id: true, userId: true, scoreTotal: true },
  });

  const responded = responses.length;
  const participation =
    totalTarget > 0 ? Math.round((responded / totalTarget) * 100) : 0;
  const avgScore =
    responded > 0
      ? Number(
          (
            responses.reduce((a, r) => a + Number(r.scoreTotal), 0) / responded
          ).toFixed(2)
        )
      : 0;

  // Participación por equipo (solo si scope=TEAMS)
  let byTeam: Array<{
    teamId: string;
    teamName: string;
    target: number;
    responded: number;
    participation: number;
    avgScore: number;
  }> = [];

  if (camp.scope === "TEAMS") {
    for (const t of camp.targets) {
      const memberIds = await prisma.teamMembership.findMany({
        where: { teamId: t.teamId, user: { companyId, status: "ACTIVE" } },
        select: { userId: true },
      });
      const setIds = new Set(memberIds.map((m) => m.userId));
      const teamTarget = memberIds.length;

      const teamResponses = responses.filter((r) => setIds.has(r.userId));
      const teamResponded = teamResponses.length;
      const teamParticipation =
        teamTarget > 0 ? Math.round((teamResponded / teamTarget) * 100) : 0;
      const teamAvg =
        teamResponded > 0
          ? Number(
              (
                teamResponses.reduce((a, r) => a + Number(r.scoreTotal), 0) /
                teamResponded
              ).toFixed(2)
            )
          : 0;

      byTeam.push({
        teamId: t.teamId,
        teamName: t.team?.name ?? "—",
        target: teamTarget,
        responded: teamResponded,
        participation: teamParticipation,
        avgScore: teamAvg,
      });
    }
  }

  return NextResponse.json({
    campaign: {
      id: camp.id,
      name: camp.name,
      scope: camp.scope,
      startDate: camp.startDate,
      endDate: camp.endDate,
      status: camp.status,
      targets: camp.targets.map((t) => ({
        teamId: t.teamId,
        name: t.team?.name ?? "—",
      })),
    },
    totals: {
      target: totalTarget,
      responded,
      participation, // %
      avgScore, // 0–100
      notResponded: totalTarget - responded,
    },
    byTeam,
  });
}
