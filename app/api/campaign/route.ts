// app/api/campaign/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

/** Helpers de permisos: Manager/Admin con BURNOUT_MANAGE pueden crear/cerrar */
function canManage(user: any) {
  return (
    hasAnyPermission(user, [PERMISSIONS.BURNOUT_MANAGE]) ||
    hasAnyPermission(user, [PERMISSIONS.COMPANIES_MANAGE])
  ); // fallback admin
}

/** Cuenta el target de una campaña */
async function countTargetUsers(campaignId: string, companyId: string) {
  const camp = await prisma.campaign.findFirst({
    where: { id: campaignId, companyId },
    include: { targets: true },
  });
  if (!camp) return 0;

  if (camp.scope === "ALL") {
    return prisma.user.count({
      where: { companyId, status: "ACTIVE" },
    });
  }
  // scope TEAMS → usuarios únicos de esas membresías
  const teamIds = camp.targets.map((t) => t.teamId);
  if (teamIds.length === 0) return 0;

  const memberships = await prisma.teamMembership.findMany({
    where: { teamId: { in: teamIds }, user: { companyId, status: "ACTIVE" } },
    select: { userId: true },
  });
  const ids = new Set(memberships.map((m) => m.userId));
  return ids.size;
}

/** Participación % (respuestas / target) */
async function participationPct(campaignId: string, companyId: string) {
  const [target, responded] = await Promise.all([
    countTargetUsers(campaignId, companyId),
    prisma.surveyResponse.count({ where: { campaignId } }),
  ]);
  if (target === 0) return { target: 0, responded, pct: 0 };
  return { target, responded, pct: Math.round((responded / target) * 100) };
}

/** GET /api/campaign  — list + filtros + paginado */
export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "20"), 100);
  const cursor = searchParams.get("cursor") ?? undefined;

  const status = searchParams.get("status") as "ACTIVE" | "CLOSED" | null;
  const createdBy = searchParams.get("createdBy") ?? undefined;
  const teamId = searchParams.get("teamId") ?? undefined;
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  const where: any = {
    companyId,
    ...(status ? { status } : {}),
    ...(createdBy ? { createdById: createdBy } : {}),
    ...(dateFrom || dateTo
      ? {
          AND: [
            dateFrom ? { startDate: { gte: new Date(dateFrom) } } : {},
            dateTo ? { endDate: { lte: new Date(dateTo) } } : {},
          ],
        }
      : {}),
    ...(teamId
      ? {
          targets: {
            some: { teamId },
          },
        }
      : {}),
  };

  const campaigns = await prisma.campaign.findMany({
    where,
    take,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      targets: { select: { teamId: true, team: { select: { name: true } } } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  const nextCursor =
    campaigns.length === take ? campaigns[campaigns.length - 1].id : null;

  // KPIs laterales: campañas por vencer (<= 7 días)
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = await prisma.campaign.findMany({
    where: { companyId, status: "ACTIVE", endDate: { lte: soon, gte: now } },
    select: { id: true, name: true, endDate: true },
    orderBy: { endDate: "asc" },
    take: 10,
  });

  // Para cada campaña listada, agrego participación rápida
  const enriched = await Promise.all(
    campaigns.map(async (c) => {
      const p = await participationPct(c.id, companyId);
      return {
        id: c.id,
        name: c.name,
        scope: c.scope,
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status,
        createdAt: c.createdAt,
        createdBy: c.createdBy,
        targets: c.targets.map((t) => ({
          teamId: t.teamId,
          name: t.team?.name,
        })),
        participation: p, // {target, responded, pct}
      };
    })
  );

  return NextResponse.json({
    campaigns: enriched,
    nextCursor,
    kpis: { expiringSoon },
  });
}

/** POST /api/campaign  — crear campaña (manager/admin) */
export async function POST(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  if (!canManage(user)) throw new PublicError("No autorizado", 403);

  const body = await req.json();
  const { name, scope, startDate, endDate, teamIds } = body as {
    name: string;
    scope: "ALL" | "TEAMS";
    startDate: string | Date;
    endDate: string | Date;
    teamIds?: string[];
  };

  if (!name || !scope || !startDate || !endDate) {
    throw new PublicError("Faltan campos obligatorios", 400);
  }
  if (scope === "TEAMS" && (!teamIds || teamIds.length === 0)) {
    throw new PublicError("Debes seleccionar al menos un equipo", 400);
  }

  // Nota: campaña inmutable luego (sin edición)
  const created = await prisma.campaign.create({
    data: {
      name,
      scope,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId,
      createdById: user.id,
      status: "ACTIVE",
      targets:
        scope === "TEAMS"
          ? {
              create: [...new Set(teamIds!)].map((tid) => ({ teamId: tid })),
            }
          : undefined,
    },
    include: {
      targets: true,
    },
  });

  return NextResponse.json({ campaign: created }, { status: 201 });
}
