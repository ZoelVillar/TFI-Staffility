import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { scopeByCompany } from "@/lib/tenant";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

// GET: obtener uno
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { user, companyId } = await requireCompanyScope();

  if (!hasAnyPermission(user, [PERMISSIONS.USERS_VIEW])) {
    throw new PublicError("No autorizado", 403);
  }

  const where = scopeByCompany(user, companyId, { id: params.id });
  const employee = await prisma.user.findFirst({ where });

  if (!employee) throw new PublicError("Empleado no encontrado", 404);
  return NextResponse.json({ employee });
}

// PUT: actualizar
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();

  if (!hasAnyPermission(user, [PERMISSIONS.USERS_MANAGE])) {
    throw new PublicError("No autorizado", 403);
  }

  const data = await req.json();
  const where = scopeByCompany(user, companyId, { id: params.id });

  const updated = await prisma.user.updateMany({
    where,
    data,
  });

  if (updated.count === 0) throw new PublicError("Empleado no encontrado", 404);
  return NextResponse.json({ ok: true });
}

// DELETE: borrar
export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();

  if (!hasAnyPermission(user, [PERMISSIONS.USERS_MANAGE])) {
    throw new PublicError("No autorizado", 403);
  }

  const where = scopeByCompany(user, companyId, { id: params.id });
  await prisma.user.deleteMany({ where });

  return NextResponse.json({ ok: true });
}
