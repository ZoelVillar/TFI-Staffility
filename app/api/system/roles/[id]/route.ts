// app/api/system/roles/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.role?.permissions?.includes(PERMISSIONS.SYSTEM_ROLES_MANAGE)
  ) {
    throw new PublicError("No autorizado", 403);
  }

  const body = await req.json();
  const { id } = params;

  const updated = await prisma.role.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? "",
      permissions: body.permissions ?? [],
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.role?.permissions?.includes(PERMISSIONS.SYSTEM_ROLES_MANAGE)
  ) {
    throw new PublicError("No autorizado", 403);
  }

  await prisma.role.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
