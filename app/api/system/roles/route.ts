// app/api/system/roles/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.role?.permissions?.includes(PERMISSIONS.SYSTEM_ROLES_MANAGE)
  ) {
    throw new PublicError("No autorizado", 403);
  }

  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.role?.permissions?.includes(PERMISSIONS.SYSTEM_ROLES_MANAGE)
  ) {
    throw new PublicError("No autorizado", 403);
  }

  const body = await req.json();
  if (!body?.name || !Array.isArray(body.permissions)) {
    throw new PublicError("Datos inválidos", 422);
  }

  const role = await prisma.role.create({
    data: {
      name: body.name,
      description: body.description ?? "",
      permissions: body.permissions,
    },
  });

  return NextResponse.json(role, { status: 201 });
}
