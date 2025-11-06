// app/api/campaign/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { PublicError } from "@/lib/errors";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";

function canView(user: any) {
  return (
    hasAnyPermission(user, [
      PERMISSIONS.BURNOUT_VIEW,
      PERMISSIONS.BURNOUT_MANAGE,
    ]) || hasAnyPermission(user, [PERMISSIONS.COMPANIES_MANAGE])
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  if (!canView(user)) throw new PublicError("No autorizado", 403);

  const camp = await prisma.campaign.findFirst({
    where: { id: params.id, companyId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      targets: {
        select: { teamId: true, team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!camp) throw new PublicError("Campaña no encontrada", 404);

  return NextResponse.json({
    id: camp.id,
    name: camp.name,
    scope: camp.scope,
    status: camp.status,
    startDate: camp.startDate,
    endDate: camp.endDate,
    createdAt: camp.createdAt,
    createdBy: camp.createdBy,
    targets: camp.targets.map((t) => ({
      teamId: t.teamId,
      name: t.team?.name,
    })),
  });
}
