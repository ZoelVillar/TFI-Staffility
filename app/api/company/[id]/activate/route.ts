import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { user } = await requireSession();

  if (!hasAnyPermission(user, [PERMISSIONS.SYSTEM_COMPANIES_MANAGE])) {
    throw new PublicError("No autorizado", 403);
  }

  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company) throw new PublicError("Empresa no encontrada", 404);

  const updated = await prisma.company.update({
    where: { id: params.id },
    data: { active: !company.active },
  });

  return NextResponse.json({ updated });
}
