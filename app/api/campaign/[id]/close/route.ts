// app/api/campaign/[id]/close/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

function canManage(user: any) {
  return (
    hasAnyPermission(user, [PERMISSIONS.BURNOUT_MANAGE]) ||
    hasAnyPermission(user, [PERMISSIONS.COMPANIES_MANAGE])
  );
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  if (!canManage(user)) throw new PublicError("No autorizado", 403);

  const camp = await prisma.campaign.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, status: true },
  });
  if (!camp) throw new PublicError("Campaña no encontrada", 404);
  if (camp.status !== "ACTIVE") {
    throw new PublicError("La campaña ya está cerrada", 400);
  }

  const updated = await prisma.campaign.update({
    where: { id: camp.id },
    data: { status: "CLOSED" },
  });

  return NextResponse.json({ campaign: updated });
}
