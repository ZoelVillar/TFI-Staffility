// app/api/manage/workload/user/[id]/route.ts
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, companyId } = await requireCompanyScope();
  if (
    !hasAnyPermission(user, [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE])
  ) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  // Resuelve la promesa de params
  const { id } = await params;

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const weekStart = getISOWeekStart(weekParam ?? new Date());
  const weekEnd = getISOWeekEnd(weekParam ?? new Date());

  const u = await prisma.user.findFirst({
    where: { id, companyId },
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

  if (!u) return new NextResponse("No encontrado", { status: 404 });

  const { capHours, capSp, hPerSp } = resolveCapacityForUser(u);

  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      ownerId: u.id,
      OR: [{ startDate: { lte: weekEnd } }, { dueDate: { gte: weekStart } }],
    },
    orderBy: { dueDate: "asc" },
  });

  let plannedHours = 0;
  const withShare = tasks.map((t) => {
    const est = t.estimateHours ?? t.estimateSp * hPerSp;
    const share = proportionalHoursInRange(
      { startDate: t.startDate, dueDate: t.dueDate, estimateHours: est },
      weekStart,
      weekEnd
    );
    plannedHours += share;
    return { ...t, shareHours: share };
  });

  const utilizationPct =
    capHours > 0 ? Math.round((plannedHours / capHours) * 100) : 0;

  let risk: "OK" | "ATTENTION" | "CRITICAL" = "OK";
  if (utilizationPct > 100) risk = "CRITICAL";
  else if (utilizationPct >= 86) risk = "ATTENTION";

  const burnout = await lastBurnoutScore(u.id);

  return NextResponse.json({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      teams: u.teamMemberships.map((tm) => tm.team),
      capHours,
      capSp,
    },
    weekStart,
    weekEnd,
    plannedHours,
    utilizationPct,
    risk,
    burnoutScore: burnout,
    tasks: withShare,
  });
}
