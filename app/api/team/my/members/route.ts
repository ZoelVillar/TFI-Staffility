// app/api/team/my/members/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const roleFilter = searchParams.get("role")?.trim() || undefined;

  const where: any = {
    companyId,
    managerId: user.id, // reportes directos del usuario actual
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

  console.log("Querying members with filter:", where);

  const members = await prisma.user.findMany({
    where,
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

  console.log("Found members:", members);
  return NextResponse.json({ members });
}
