// app/api/manage/workload/summary/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import {
  getISOWeekStart,
  getISOWeekEnd,
  resolveCapacityForUser,
  proportionalHoursInRange,
} from "@/lib/workload";

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  // 1. CAMBIO DE SEGURIDAD: Permitimos TEAM_VIEW (que tienen los empleados)
  // Antes solo permitía USERS_VIEW/MANAGE.
  if (
    !hasAnyPermission(user, [PERMISSIONS.TEAM_VIEW, PERMISSIONS.USERS_VIEW])
  ) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const teamId = searchParams.get("teamId");

  const weekStart = getISOWeekStart(weekParam ?? new Date());
  const weekEnd = getISOWeekEnd(weekParam ?? new Date());

  // 2. Determinar el alcance (Scope) de equipos
  const isGlobalAdmin = hasAnyPermission(user, [PERMISSIONS.COMPANIES_MANAGE]);

  // Filtro base para usuarios
  let teamFilter: any = {};

  if (teamId) {
    // Si pide un equipo específico, filtramos por ese
    teamFilter = { teamMemberships: { some: { teamId } } };
  } else if (!isGlobalAdmin) {
    // Si es Empleado/Manager y pide "todos" (dashboard general),
    // solo mostramos usuarios que estén en SUS equipos.

    // Obtener IDs de mis equipos
    const myTeams = await prisma.teamMembership.findMany({
      where: { userId: user.id },
      select: { teamId: true },
    });
    const myTeamIds = myTeams.map((t) => t.teamId);

    if (myTeamIds.length === 0) {
      // Si no está en ningún equipo, devolvemos vacío
      return NextResponse.json({ weekStart, weekEnd, teams: [], users: [] });
    }

    teamFilter = { teamMemberships: { some: { teamId: { in: myTeamIds } } } };
  }

  // 3. Fetch Users (Con el filtro de equipo aplicado)
  const users = await prisma.user.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...teamFilter,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      capacityHoursPerWeek: true,
      capacitySpPerWeek: true,
      seniority: true,
      employmentType: true,
      hoursPerStoryPoint: true,
      status: true,
      teamMemberships: {
        select: { team: { select: { id: true, name: true } } },
      },
    },
  });

  // Si no hay usuarios en el alcance, retornar vacío rápido
  if (users.length === 0) {
    return NextResponse.json({ weekStart, weekEnd, teams: [], users: [] });
  }

  // 4. Fetch Tasks (Para calcular carga)
  const userIds = users.map((u) => u.id);
  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      ownerId: { in: userIds },
      OR: [
        { startDate: { lte: weekEnd }, dueDate: { gte: weekStart } },
        { status: { in: ["IN_PROGRESS", "BLOCKED"] } },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      status: true,
      startDate: true,
      dueDate: true,
      estimateSp: true,
      estimateHours: true,
    },
  });

  // 5. Procesamiento en Memoria (Cálculo de Carga)
  const userStats = await Promise.all(
    users.map(async (u) => {
      const cap = resolveCapacityForUser(u);
      const myTasks = tasks.filter((t) => t.ownerId === u.id);

      let plannedHours = 0;
      myTasks.forEach((t) => {
        const est = t.estimateHours ?? t.estimateSp * cap.hPerSp;
        plannedHours += proportionalHoursInRange(
          { startDate: t.startDate, dueDate: t.dueDate, estimateHours: est },
          weekStart,
          weekEnd
        );
      });

      const utilization =
        cap.capHours > 0 ? Math.round((plannedHours / cap.capHours) * 100) : 0;

      const activeCount = myTasks.filter(
        (t) => t.status === "IN_PROGRESS"
      ).length;
      const blockedCount = myTasks.filter((t) => t.status === "BLOCKED").length;

      let risk: "OK" | "ATTENTION" | "CRITICAL" = "OK";
      if (utilization > 100) risk = "CRITICAL";
      else if (utilization >= 85) risk = "ATTENTION";

      return {
        ...u,
        stats: {
          plannedHours,
          capacity: cap.capHours,
          utilization,
          risk,
          activeCount,
          blockedCount,
        },
      };
    })
  );

  // 6. Agregación por Equipo (Solo mostramos equipos visibles)
  if (!teamId) {
    const teamsMap = new Map<
      string,
      {
        id: string;
        name: string;
        members: number;
        totalUtil: number;
        blocked: number;
        criticalMembers: number;
      }
    >();

    userStats.forEach((u) => {
      u.teamMemberships.forEach((tm) => {
        // CRÍTICO: Si soy empleado, solo agregar al mapa los equipos que SON MÍOS.
        // El filtro de usuarios ya limitó los usuarios, pero un usuario puede estar en Equipo A (Mío) y Equipo B (No mío).
        // Aquí filtramos visualmente los equipos ajenos si no soy admin.

        // Validar si el usuario actual (el que consulta) tiene acceso a ESTE equipo del loop
        // Si aplicamos el filtro en el paso 2, los usuarios traídos SON miembros de mis equipos.
        // Pero hay un caso de borde: Un compañero está en Mi Equipo y en Otro Equipo.
        // Al iterar sus memberships, aparecerá el Otro Equipo. Debemos filtrarlo.

        if (!isGlobalAdmin) {
          // Aquí necesitamos saber si el usuario actual (req.user) está en tm.team.id
          // Como es costoso verificar uno por uno aquí, una estrategia mejor es:
          // Ya filtramos users por "estar en mis equipos".
          // Simplemente aceptamos que veré "Carga del Equipo B" si mi compañero está en él.
          // O, más estricto: Traer mis teamIds arriba y chequear aquí.
          // Hagámoslo estricto para cumplir requerimiento 1.
          // (Nota: Esto requiere haber traído myTeamIds en el paso 2, lo re-implemento mentalmente abajo)
          // Para simplicidad en este bloque: si el filtro de paso 2 funcionó, los equipos devueltos son relevantes.
        }

        if (!teamsMap.has(tm.team.id)) {
          teamsMap.set(tm.team.id, {
            id: tm.team.id,
            name: tm.team.name,
            members: 0,
            totalUtil: 0,
            blocked: 0,
            criticalMembers: 0,
          });
        }

        const t = teamsMap.get(tm.team.id)!;
        // Evitar contar al mismo miembro dos veces si procesamos mal, pero aquí vamos por usuario.
        // Solo incrementamos contadores si el usuario pertenece a este equipo (ya validado por estructura).
        t.members++;
        t.totalUtil += u.stats.utilization;
        t.blocked += u.stats.blockedCount;
        if (u.stats.risk === "CRITICAL") t.criticalMembers++;
      });
    });

    // Filtrado final de equipos (Para eliminar equipos "ajenos" que aparecieron por cruce de usuarios)
    let resultTeams = Array.from(teamsMap.values());

    if (!isGlobalAdmin) {
      const myMemberships = await prisma.teamMembership.findMany({
        where: { userId: user.id },
        select: { teamId: true },
      });
      const myIds = new Set(myMemberships.map((m) => m.teamId));
      resultTeams = resultTeams.filter((t) => myIds.has(t.id));
    }

    const teamSummary = resultTeams.map((t) => ({
      ...t,
      avgUtilization: t.members > 0 ? Math.round(t.totalUtil / t.members) : 0,
    }));

    return NextResponse.json({ weekStart, weekEnd, teams: teamSummary });
  }

  return NextResponse.json({ weekStart, weekEnd, users: userStats });
}
