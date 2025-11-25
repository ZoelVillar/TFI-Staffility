// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import {
  startOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  resolveCapacityForUser,
  proportionalHoursInRange,
} from "@/lib/workload";

// --- HELPER: Calcular Tendencia de Burnout (Últimos 6 meses) ---
async function getBurnoutTrend(userIds: string[] | null, companyId: string) {
  const since = subMonths(new Date(), 6);

  // Obtenemos snapshots históricos agrupados por semana
  const snapshots = await prisma.workloadSnapshot.findMany({
    where: {
      user: {
        companyId,
        ...(userIds ? { id: { in: userIds } } : {}),
      },
      weekStart: { gte: since },
      burnoutScore: { not: null }, // Solo si hay dato de burnout
    },
    orderBy: { weekStart: "asc" },
    select: { weekStart: true, burnoutScore: true },
  });

  // Agrupación manual por mes para el gráfico (Promedio)
  const groups = new Map<string, { sum: number; count: number }>();

  snapshots.forEach((s) => {
    const key = format(s.weekStart, "MMM", { locale: es }); // Ej: "Nov"
    if (!groups.has(key)) groups.set(key, { sum: 0, count: 0 });
    const entry = groups.get(key)!;
    entry.sum += Number(s.burnoutScore);
    entry.count += 1;
  });

  // Si no hay datos, devolvemos array vacío o placeholder
  if (groups.size === 0) return [];

  return Array.from(groups.entries()).map(([name, val]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalizar
    value: Math.round(val.sum / val.count),
  }));
}

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  // 1. Detección de Rol Jerárquico
  let roleType: "ADMIN" | "MANAGER" | "EMPLOYEE" = "EMPLOYEE";
  if (
    hasAnyPermission(user, [
      PERMISSIONS.COMPANIES_MANAGE,
      PERMISSIONS.SYSTEM_COMPANIES_MANAGE,
    ])
  )
    roleType = "ADMIN";
  else if (hasAnyPermission(user, [PERMISSIONS.TEAM_MANAGE]))
    roleType = "MANAGER";

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // =================================================================
  // LÓGICA: ADMINISTRADOR (Visión Global)
  // =================================================================
  if (roleType === "ADMIN") {
    const [totalUsers, totalTeams, activeCampaigns] = await Promise.all([
      prisma.user.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.team.count({ where: { companyId } }),
      prisma.campaign.count({ where: { companyId, status: "ACTIVE" } }),
    ]);

    // Buscar Riesgos Críticos (Snapshots de esta semana o la pasada)
    const criticalSnapshots = await prisma.workloadSnapshot.findMany({
      where: {
        user: { companyId },
        weekStart: { gte: subWeeks(now, 2) },
        riskLevel: "CRITICAL",
      },
      distinct: ["userId"], // Un aviso por usuario
      include: { user: { select: { name: true } } },
    });

    const trend = await getBurnoutTrend(null, companyId);

    const actionItems = criticalSnapshots.map((s) => ({
      id: `risk-${s.id}`,
      title: `Riesgo Crítico: ${s.user.name} tiene sobrecarga severa.`,
      type: "danger",
      link: `/team/workload`,
    }));

    return NextResponse.json({
      role: "ADMIN",
      kpis: [
        {
          label: "Empleados",
          value: totalUsers,
          icon: "users",
          status: "neutral",
        },
        {
          label: "Equipos",
          value: totalTeams,
          icon: "grid",
          status: "neutral",
        },
        {
          label: "Campañas Activas",
          value: activeCampaigns,
          icon: "activity",
          status: "success",
        },
        {
          label: "Casos Críticos",
          value: criticalSnapshots.length,
          icon: "alert",
          status: criticalSnapshots.length > 0 ? "danger" : "success",
        },
      ],
      charts: {
        burnoutTrend:
          trend.length > 0 ? trend : [{ name: "Sin datos", value: 0 }],
        taskDistribution: [], // Admin usa AreaChart, no Pie
      },
      actionItems,
    });
  }

  // =================================================================
  // LÓGICA: MANAGER (Visión de Equipo)
  // =================================================================
  if (roleType === "MANAGER") {
    // Identificar mis equipos y miembros
    const myTeams = await prisma.team.findMany({
      where: {
        companyId,
        OR: [
          { leadId: user.id },
          { memberships: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    });
    const teamIds = myTeams.map((t) => t.id);

    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true },
    });
    const memberIds = [...new Set(memberships.map((m) => m.userId))];

    // Buscar problemas reales en mis miembros
    const [blockedTasks, criticalWorkload] = await Promise.all([
      prisma.task.findMany({
        where: { ownerId: { in: memberIds }, status: "BLOCKED" },
        include: { owner: { select: { name: true } } },
        take: 5, // Top 5 bloqueos
      }),
      prisma.workloadSnapshot.findMany({
        where: {
          userId: { in: memberIds },
          weekStart: { gte: subWeeks(now, 1) },
          riskLevel: "CRITICAL",
        },
        include: { user: { select: { name: true } } },
        distinct: ["userId"],
      }),
    ]);

    // Último promedio de Burnout del equipo
    const lastSnapshots = await prisma.workloadSnapshot.findMany({
      where: {
        userId: { in: memberIds },
        weekStart: { gte: subWeeks(now, 4) },
        burnoutScore: { not: null },
      },
      orderBy: { weekStart: "desc" },
      take: memberIds.length,
    });

    const avgScore =
      lastSnapshots.length > 0
        ? Math.round(
            lastSnapshots.reduce((a, b) => a + Number(b.burnoutScore), 0) /
              lastSnapshots.length
          )
        : 0;

    // Gráfico de tendencia filtrado por mis miembros
    const trend = await getBurnoutTrend(memberIds, companyId);

    // Construir alertas
    const alerts = [
      ...criticalWorkload.map((s) => ({
        id: `load-${s.id}`,
        title: `Sobrecarga: ${s.user.name} supera su capacidad máxima.`,
        type: "danger",
        link: `/employees/${s.userId}`, // Ir al perfil para ver detalle
      })),
      ...blockedTasks.map((t) => ({
        id: `block-${t.id}`,
        title: `Bloqueo: ${t.owner.name} en "${t.title}"`,
        type: "warning",
        link: `/my-work`, // Idealmente link a detalle de tarea, ponemos my-work por ahora
      })),
    ];

    return NextResponse.json({
      role: "MANAGER",
      kpis: [
        {
          label: "Mis Equipos",
          value: myTeams.length,
          icon: "grid",
          status: "neutral",
        },
        {
          label: "Miembros",
          value: memberIds.length,
          icon: "users",
          status: "neutral",
        },
        {
          label: "Nivel de Estrés",
          value: avgScore,
          icon: "activity",
          status:
            avgScore > 60 ? "danger" : avgScore > 40 ? "warning" : "success",
        },
        {
          label: "Bloqueos Activos",
          value: blockedTasks.length,
          icon: "alert",
          status: blockedTasks.length > 0 ? "warning" : "success",
        },
      ],
      charts: {
        burnoutTrend:
          trend.length > 0 ? trend : [{ name: "Sin datos", value: 0 }],
        taskDistribution: [],
      },
      actionItems: alerts,
    });
  }

  // =================================================================
  // LÓGICA: EMPLEADO (Visión Personal)
  // =================================================================

  // 1. Calcular Carga Real (Planned vs Capacity)
  const myUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      capacityHoursPerWeek: true,
      employmentType: true,
      seniority: true,
      hoursPerStoryPoint: true,
    },
  });

  const cap = resolveCapacityForUser(myUser as any);

  // Traemos tareas que toquen esta semana o estén activas
  const myTasks = await prisma.task.findMany({
    where: {
      ownerId: user.id,
      status: { not: "CANCELLED" },
      OR: [
        { startDate: { lte: weekEnd }, dueDate: { gte: weekStart } },
        { status: { in: ["IN_PROGRESS", "BLOCKED", "PENDING"] } },
      ],
    },
  });

  let plannedHours = 0;
  let blockedCount = 0;
  let pendingCount = 0;

  myTasks.forEach((t) => {
    if (t.status === "BLOCKED") blockedCount++;
    if (t.status === "PENDING") pendingCount++;

    // Usamos la lógica centralizada de workload para ser precisos con fines de semana
    const est = t.estimateHours ?? t.estimateSp * cap.hPerSp;
    plannedHours += proportionalHoursInRange(
      { startDate: t.startDate, dueDate: t.dueDate, estimateHours: est },
      weekStart,
      weekEnd
    );
  });

  const utilization =
    cap.capHours > 0 ? Math.round((plannedHours / cap.capHours) * 100) : 0;

  // 2. Encuestas Pendientes
  const activeCamps = await prisma.campaign.findMany({
    where: { companyId, status: "ACTIVE", endDate: { gte: now } },
    include: { targets: true },
  });

  // Filtrar las que me tocan y NO he respondido
  let pendingSurveysCount = 0;
  let firstPendingLink = null;

  for (const camp of activeCamps) {
    // Verificar target (simplificado: si es ALL o estoy en el team)
    let isInTarget = camp.scope === "ALL";
    if (camp.scope === "TEAMS") {
      const myMembership = await prisma.teamMembership.findFirst({
        where: {
          userId: user.id,
          teamId: { in: camp.targets.map((t) => t.teamId) },
        },
      });
      if (myMembership) isInTarget = true;
    }

    if (isInTarget) {
      const response = await prisma.surveyResponse.findUnique({
        where: { campaignId_userId: { campaignId: camp.id, userId: user.id } },
      });
      if (!response) {
        pendingSurveysCount++;
        if (!firstPendingLink) firstPendingLink = `/surveys/my/${camp.id}`;
      }
    }
  }

  // Action Items Personales
  const actions = [];
  if (pendingSurveysCount > 0) {
    actions.push({
      id: "surv",
      title: `Tienes ${pendingSurveysCount} encuesta(s) pendiente(s)`,
      type: "info",
      link: firstPendingLink || "/surveys/my",
    });
  }
  if (blockedCount > 0) {
    actions.push({
      id: "block",
      title: `Tienes ${blockedCount} tarea(s) bloqueada(s).`,
      type: "warning",
      link: "/my-work",
    });
  }
  if (utilization > 100) {
    actions.push({
      id: "overload",
      title: `Estás sobrecargado (${utilization}%). Habla con tu manager.`,
      type: "danger",
      link: "/my-work",
    });
  }

  // Último Score propio
  const lastRes = await prisma.surveyResponse.findFirst({
    where: { userId: user.id },
    orderBy: { submittedAt: "desc" },
    select: { scoreTotal: true },
  });

  return NextResponse.json({
    role: "EMPLOYEE",
    kpis: [
      {
        label: "Carga Semanal",
        value: `${utilization}%`,
        icon: "activity",
        status: utilization > 100 ? "danger" : "neutral",
      },
      {
        label: "Tareas Pendientes",
        value: pendingCount,
        icon: "list",
        status: "neutral",
      },
      {
        label: "Bloqueadas",
        value: blockedCount,
        icon: "alert",
        status: blockedCount > 0 ? "warning" : "success",
      },
      {
        label: "Último Score",
        value: lastRes ? Number(lastRes.scoreTotal) : "-",
        icon: "check",
        status: "neutral",
      },
    ],
    charts: {
      // Datos para el PieChart
      taskDistribution: [
        {
          name: "Ocupado",
          value: Math.min(100, utilization),
          fill: utilization > 100 ? "#ef4444" : "#3b82f6",
        }, // Red if overloaded
        {
          name: "Disponible",
          value: Math.max(0, 100 - utilization),
          fill: "#e2e8f0",
        }, // Slate-200
      ],
      burnoutTrend: [],
    },
    actionItems: actions,
  });
}
