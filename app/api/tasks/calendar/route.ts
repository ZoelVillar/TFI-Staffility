// app/api/tasks/calendar/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to)
    return new NextResponse("Parámetros from/to requeridos", { status: 400 });

  const items = await prisma.task.findMany({
    where: {
      companyId,
      ownerId: user.id,
      OR: [
        { startDate: { gte: new Date(from), lte: new Date(to) } },
        { dueDate: { gte: new Date(from), lte: new Date(to) } },
      ],
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({ items });
}
