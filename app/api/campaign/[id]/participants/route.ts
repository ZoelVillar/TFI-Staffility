// app/api/campaign/[id]/participants/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

function canView(user: any) {
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
  if (!camp) return { ids: [] as string[], camp: null };

  if (camp.scope === "ALL") {
    const users = await prisma.user.findMany({
      where: { companyId, status: "ACTIVE" },
      select: { id: true },
    });
    return { ids: users.map((u) => u.id), camp };
  }

  const teamIds = camp.targets.map((t) => t.teamId);
  if (teamIds.length === 0) return { ids: [], camp };

  const memberships = await prisma.teamMembership.findMany({
    where: { teamId: { in: teamIds }, user: { companyId, status: "ACTIVE" } },
    select: { userId: true },
  });
  return { ids: [...new Set(memberships.map((m) => m.userId))], camp };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  if (!canView(user)) throw new PublicError("No autorizado", 403);

  const { ids, camp } = await getTargetUserIds(params.id, companyId);
  if (!camp) throw new PublicError("Campaña no encontrada", 404);

  // Users target
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      position: true,
      teamMemberships: {
        select: { team: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Responses of this campaign
  const responses = await prisma.surveyResponse.findMany({
    where: { campaignId: params.id, userId: { in: ids } },
    select: { userId: true, scoreTotal: true, submittedAt: true },
  });
  const byUser = new Map(
    responses.map((r) => [
      r.userId,
      { score: Number(r.scoreTotal), submittedAt: r.submittedAt },
    ])
  );

  const participants = users.map((u) => {
    const r = byUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      position: u.position,
      image: u.image,
      teams: u.teamMemberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
      })),
      responded: Boolean(r),
      score: r?.score ?? null,
      submittedAt: r?.submittedAt ?? null,
    };
  });

  // KPIs rápidos
  const responded = responses.length;
  const target = ids.length;
  const participation = target > 0 ? Math.round((responded / target) * 100) : 0;
  const avgScore =
    responded > 0
      ? Number(
          (
            responses.reduce((a, r) => a + Number(r.scoreTotal), 0) / responded
          ).toFixed(2)
        )
      : 0;

  return NextResponse.json({
    campaign: {
      id: camp.id,
      name: camp.name,
      startDate: camp.startDate,
      endDate: camp.endDate,
      status: camp.status,
      scope: camp.scope,
    },
    kpis: {
      target,
      responded,
      notResponded: target - responded,
      participation,
      avgScore,
    },
    participants,
  });
}
