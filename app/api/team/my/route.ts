// app/api/team/my/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { PublicError } from "@/lib/errors";

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  // Cualquier usuario autenticado del tenant puede ver "su equipo" (sus reportes directos)

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const roleFilter = searchParams.get("role")?.trim() || undefined;

  // líder (manager del usuario)
  const leader = user?.managerId
    ? await prisma.user.findFirst({
        where: { id: user.managerId, companyId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          position: true,
        },
      })
    : null;

  // reportes directos (mi equipo)
  const whereReports: any = {
    companyId,
    managerId: user.id,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { position: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(roleFilter
      ? { position: { contains: roleFilter, mode: "insensitive" } }
      : {}),
  };

  const members = await prisma.user.findMany({
    where: whereReports,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      position: true,
      department: true,
      seniority: true,
      status: true,
    },
  });

  return NextResponse.json({ leader, members });
}
