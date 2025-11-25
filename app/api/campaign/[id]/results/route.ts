// app/api/campaign/[id]/results/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";
import { scoreSurvey, getDimensionLabel } from "@/lib/survey";

/** Helpers de permisos de visualización */
function canView(user: any) {
  return (
    hasAnyPermission(user, [
      PERMISSIONS.BURNOUT_VIEW,
      PERMISSIONS.BURNOUT_MANAGE,
    ]) || hasAnyPermission(user, [PERMISSIONS.COMPANIES_MANAGE])
  );
}

// Obtiene todos los usuarios que DEBERÍAN haber respondido
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, companyId } = await requireCompanyScope();
  if (!canView(user)) throw new PublicError("No autorizado", 403);

  const { id } = await params;

  const camp = await prisma.campaign.findFirst({
    where: { id, companyId },
    include: {
      targets: {
        select: { teamId: true, team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!camp) throw new PublicError("Campaña no encontrada", 404);

  // 1. Datos Generales
  const targetUserIds = await getTargetUserIds(camp.id, companyId);
  const totalTarget = targetUserIds.length;

  // 2. Fetch de respuestas (con JSON de respuestas)
  const responses = await prisma.surveyResponse.findMany({
    where: { campaignId: camp.id },
    select: {
      id: true,
      userId: true,
      scoreTotal: true,
      answers: true,
    },
  });

  // --- Lógica de Radar (Dimensiones) ---
  const dimAggregation: Record<string, { sum: number; count: number }> = {};

  responses.forEach((r) => {
    if (!r.answers) return;
    const result = scoreSurvey(r.answers as Record<string, number>);
    if (result.dimensions) {
      Object.entries(result.dimensions).forEach(([dimKey, score]) => {
        if (!dimAggregation[dimKey]) {
          dimAggregation[dimKey] = { sum: 0, count: 0 };
        }
        dimAggregation[dimKey].sum += score;
        dimAggregation[dimKey].count += 1;
      });
    }
  });

  const radarData = Object.entries(dimAggregation).map(([dimKey, data]) => ({
    subject: getDimensionLabel(dimKey),
    score: data.count > 0 ? Math.round(data.sum / data.count) : 0,
    fullMark: 100,
    id: dimKey,
  }));

  // --- KPIs Globales ---
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

  // --- Lógica de Equipos (CORREGIDA) ---
  // Ya no dependemos de camp.scope === 'TEAMS'. Calculamos para TODOS los equipos de la empresa.

  // 1. Traer todos los equipos de la empresa
  const allTeams = await prisma.team.findMany({
    where: { companyId },
    select: { id: true, name: true },
  });

  // 2. Traer membresías de los usuarios que respondieron
  // Optimizacion: Solo buscamos membresías de los que respondieron para no traer toda la tabla
  const responderIds = responses.map((r) => r.userId);

  const memberships = await prisma.teamMembership.findMany({
    where: {
      userId: { in: responderIds },
      team: { companyId }, // Asegurar tenant
    },
    select: { teamId: true, userId: true },
  });

  // 3. Mapear Score -> Usuario -> Equipos
  // Un usuario puede estar en múltiples equipos, su score impacta en todos ellos.
  const responseMap = new Map(
    responses.map((r) => [r.userId, Number(r.scoreTotal)])
  );

  const teamStats = new Map<
    string,
    { name: string; totalScore: number; count: number }
  >();

  // Inicializar mapa con todos los equipos (para mostrar incluso los que tienen 0 respuestas si se desea, o filtrar despues)
  allTeams.forEach((t) => {
    teamStats.set(t.id, { name: t.name, totalScore: 0, count: 0 });
  });

  // Acumular scores
  memberships.forEach((m) => {
    const score = responseMap.get(m.userId);
    if (score !== undefined && teamStats.has(m.teamId)) {
      const stat = teamStats.get(m.teamId)!;
      stat.totalScore += score;
      stat.count += 1;
    }
  });

  // 4. Generar Array final
  const byTeam = Array.from(teamStats.values())
    .filter((t) => t.count > 0) // Solo mostrar equipos con al menos 1 respuesta
    .map((t) => ({
      teamId: "generated", // No crítico para el gráfico
      teamName: t.name,
      target: 0, // No calculamos target individual por equipo en vista global para ahorrar query
      responded: t.count,
      participation: 0, // Opcional
      avgScore: Math.round(t.totalScore / t.count),
    }))
    .sort((a, b) => b.avgScore - a.avgScore); // Ordenar por mayor estrés

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
      participation,
      avgScore,
      notResponded: totalTarget - responded,
    },
    radarData,
    byTeam, // <--- Ahora siempre tendrá datos si hay equipos con respuestas
  });
}
