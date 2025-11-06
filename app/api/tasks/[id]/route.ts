// app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { defaultHoursPerSPBySeniority } from "@/lib/workload";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  const task = await prisma.task.findFirst({
    where: { id: params.id, companyId, ownerId: user.id },
  });
  if (!task) return new NextResponse("No encontrado", { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  const existing = await prisma.task.findFirst({
    where: { id: params.id, companyId, ownerId: user.id },
  });
  if (!existing) return new NextResponse("No encontrado", { status: 404 });

  const body = await req.json();
  const patch: any = {};

  for (const k of [
    "title",
    "description",
    "type",
    "priority",
    "status",
    "progressPct",
    "tags",
    "teamId",
  ]) {
    if (k in body) patch[k] = body[k];
  }
  if ("startDate" in body)
    patch.startDate = body.startDate ? new Date(body.startDate) : null;
  if ("dueDate" in body)
    patch.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if ("estimateSp" in body) patch.estimateSp = Number(body.estimateSp ?? 0);
  if ("estimateHours" in body)
    patch.estimateHours =
      body.estimateHours == null ? null : Number(body.estimateHours);

  // Recalcular estimateHours si viene estimateSp pero NO viene estimateHours explícito
  if ("estimateSp" in body && !("estimateHours" in body)) {
    const dbUser = await prisma.user.findFirst({
      where: { id: user.id, companyId },
      select: { seniority: true, hoursPerStoryPoint: true },
    });
    const hPerSp =
      dbUser?.hoursPerStoryPoint ??
      defaultHoursPerSPBySeniority(dbUser?.seniority ?? undefined);
    patch.estimateHours = Math.max(
      0,
      Number(patch.estimateSp ?? existing.estimateSp) * hPerSp
    );
  }

  const updated = await prisma.task.update({
    where: { id: existing.id },
    data: patch,
  });
  return NextResponse.json({ task: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  const existing = await prisma.task.findFirst({
    where: { id: params.id, companyId, ownerId: user.id },
    select: { id: true },
  });
  if (!existing) return new NextResponse("No encontrado", { status: 404 });

  await prisma.task.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
