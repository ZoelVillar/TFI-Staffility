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
  taskEstimatedHours,
  proportionalHoursInRange,
  lastBurnoutScore,
} from "@/lib/workload";

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  if (
    !hasAnyPermission(user, [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE])
  ) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week"); // cualquier fecha dentro de la semana
  const teamId = searchParams.get("teamId") || undefined;
  const take = Math.min(parseInt(searchParams.get("take") ?? "50"), 200);
  const cursor = searchParams.get("cursor") || undefined;

  const weekStart = getISOWeekStart(weekParam ?? new Date());
  const weekEnd = getISOWeekEnd(weekParam ?? new Date());

  // empleados (activos) de la empresa (filtrables por team)
  const users = await prisma.user.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...(teamId ? { teamMemberships: { some: { teamId } } } : {}),
    },
    take,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      employmentType: true,
      seniority: true,
      capacityHoursPerWeek: true,
      capacitySpPerWeek: true,
      hoursPerStoryPoint: true,
      teamMemberships: {
        select: { team: { select: { id: true, name: true } } },
      },
    },
  });

  const nextCursor = users.length === take ? users[users.length - 1].id : null;

  // tareas del rango por usuario
  const userIds = users.map((u) => u.id);
  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      ownerId: { in: userIds },
      OR: [{ startDate: { lte: weekEnd } }, { dueDate: { gte: weekStart } }],
    },
    select: {
      id: true,
      ownerId: true,
      startDate: true,
      dueDate: true,
      estimateSp: true,
      estimateHours: true,
    },
  });

  // bucket por usuario
  const tasksByUser = new Map<string, typeof tasks>();
  for (const u of userIds) tasksByUser.set(u, []);
  for (const t of tasks) tasksByUser.get(t.ownerId)?.push(t as any);

  const rows = await Promise.all(
    users.map(async (u) => {
      const { capHours, capSp, hPerSp } = resolveCapacityForUser(u);
      const myTasks = tasksByUser.get(u.id) ?? [];

      // horas planificadas en la semana por proporción
      let plannedHours = 0;
      for (const t of myTasks) {
        const estH = t.estimateHours ?? t.estimateSp * hPerSp;
        plannedHours += proportionalHoursInRange(
          { startDate: t.startDate, dueDate: t.dueDate, estimateHours: estH },
          weekStart,
          weekEnd
        );
      }

      const utilizationPct =
        capHours > 0 ? Math.round((plannedHours / capHours) * 100) : 0;
      let risk: "OK" | "ATTENTION" | "CRITICAL" = "OK";
      if (utilizationPct > 100) risk = "CRITICAL";
      else if (utilizationPct >= 86) risk = "ATTENTION";

      const burnout = await lastBurnoutScore(u.id); // puede ser null

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        teams: u.teamMemberships.map((tm) => tm.team),
        capHours,
        capSp,
        plannedHours,
        utilizationPct,
        risk,
        burnoutScore: burnout,
      };
    })
  );

  return NextResponse.json({ weekStart, weekEnd, items: rows, nextCursor });
}
