// app/api/tasks/[id]/comments/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  // owner puede ver; manager/admin también
  const task = await prisma.task.findFirst({
    where: { id: params.id, companyId },
    select: { ownerId: true },
  });
  if (!task) return new NextResponse("No encontrado", { status: 404 });

  const allow =
    task.ownerId === user.id ||
    hasAnyPermission(user, [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE]);
  if (!allow) return new NextResponse("No autorizado", { status: 403 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId: params.id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ comments });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  // owner y manager/admin pueden comentar
  const task = await prisma.task.findFirst({
    where: { id: params.id, companyId },
    select: { ownerId: true },
  });
  if (!task) return new NextResponse("No encontrado", { status: 404 });

  const allow =
    task.ownerId === user.id ||
    hasAnyPermission(user, [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE]);
  if (!allow) return new NextResponse("No autorizado", { status: 403 });

  const body = await req.json();
  const saved = await prisma.taskComment.create({
    data: {
      taskId: params.id,
      authorId: user.id,
      body: String(body?.body ?? "").slice(0, 5000),
    },
  });
  return NextResponse.json({ comment: saved });
}
