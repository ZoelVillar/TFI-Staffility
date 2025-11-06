// app/api/team/my/leader/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

export async function GET() {
  const { user, companyId } = await requireCompanyScope();

  // Traemos user desde DB para asegurarnos de tener managerId
  const dbUser = await prisma.user.findFirst({
    where: { id: user.id, companyId },
    select: { managerId: true },
  });

  if (!dbUser?.managerId) {
    return NextResponse.json({ leader: null });
  }

  const leader = await prisma.user.findFirst({
    where: { id: dbUser.managerId, companyId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      position: true,
    },
  });

  return NextResponse.json({ leader });
}
