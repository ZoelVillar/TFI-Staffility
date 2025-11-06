// app/api/workload/snapshot/run/route.ts
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
  lastBurnoutScore,
} from "@/lib/workload";

export async function POST(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  if (
    !hasAnyPermission(user, [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE])
  ) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const body = await req.json();
  const weekParam = body?.week ?? new Date();
  const teamId: string | undefined = body?.teamId || undefined;

  const weekStart = getISOWeekStart(weekParam);
  const weekEnd = getISOWeekEnd(weekParam);

  const users = await prisma.user.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...(teamId ? { teamMemberships: { some: { teamId } } } : {}),
    },
    select: {
      id: true,
      status: true,
      employmentType: true,
      seniority: true,
      capacityHoursPerWeek: true,
      capacitySpPerWeek: true,
      hoursPerStoryPoint: true,
    },
  });

  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      ownerId: { in: users.map((u) => u.id) },
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

  // Agrupar tareas por usuario
  const byUser = new Map<string, typeof tasks>();
  for (const u of users) byUser.set(u.id, []);
  for (const t of tasks) byUser.get(t.ownerId)?.push(t);

  const upserts = [];
  for (const u of users) {
    const cap = resolveCapacityForUser(u);
    const my = byUser.get(u.id) ?? [];
    let plannedHours = 0;

    for (const t of my) {
      const est = t.estimateHours ?? t.estimateSp * cap.hPerSp;
      plannedHours += proportionalHoursInRange(
        { startDate: t.startDate, dueDate: t.dueDate, estimateHours: est },
        weekStart,
        weekEnd
      );
    }

    const utilizationPct =
      cap.capHours > 0 ? Math.round((plannedHours / cap.capHours) * 100) : 0;
    let risk: "OK" | "ATTENTION" | "CRITICAL" = "OK";
    if (utilizationPct > 100) risk = "CRITICAL";
    else if (utilizationPct >= 86) risk = "ATTENTION";

    const burnout = await lastBurnoutScore(u.id);

    upserts.push(
      prisma.workloadSnapshot.upsert({
        where: { userId_weekStart: { userId: u.id, weekStart } },
        create: {
          userId: u.id,
          weekStart,
          plannedSp: 0, // si más adelante agregás breakdown por SP semanal
          plannedHours,
          capacitySp: cap.capSp,
          capacityHours: cap.capHours,
          utilizationPct,
          riskLevel: risk as any,
          burnoutScore: burnout != null ? (burnout.toFixed(2) as any) : null,
        },
        update: {
          plannedHours,
          capacityHours: cap.capHours,
          capacitySp: cap.capSp,
          utilizationPct,
          riskLevel: risk as any,
          burnoutScore: burnout != null ? (burnout.toFixed(2) as any) : null,
        },
      })
    );
  }

  await prisma.$transaction(upserts);
  return NextResponse.json({
    ok: true,
    count: upserts.length,
    weekStart,
    weekEnd,
  });
}
