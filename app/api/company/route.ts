import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { scopeByCompany } from "@/lib/tenant";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

export async function GET() {
  const { user, companyId } = await requireSession();

  // SystemAdmin puede ver todas las empresas
  const where = scopeByCompany(user, companyId, {}, { allowSystemWide: true });

  const companies = await prisma.company.findMany({
    where,
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });

  const metrics = {
    total: companies.length,
    active: companies.filter((c) => c.active).length,
    inactive: companies.filter((c) => !c.active).length,
    totalUsers: companies.reduce((a, c) => a + c._count.users, 0),
  };

  return NextResponse.json({ companies, metrics });
}

export async function POST(req: Request) {
  const { user } = await requireSession();

  if (!hasAnyPermission(user, [PERMISSIONS.SYSTEM_COMPANIES_MANAGE])) {
    throw new PublicError("No autorizado", 403);
  }

  const data = await req.json();
  const created = await prisma.company.create({
    data: {
      ...data,
      active: false, // por defecto
    },
  });

  return NextResponse.json({ created });
}
