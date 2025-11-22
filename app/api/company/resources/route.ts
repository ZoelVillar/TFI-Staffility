// app/api/company/resources/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";

export async function GET() {
  const { user, companyId } = await requireCompanyScope();

  // 1. Obtener Roles disponibles (excluyendo SystemAdmin si no es SystemAdmin)
  const roles = await prisma.role.findMany({
    where: {
      name: { not: "SystemAdmin" } // Por seguridad básica, ocultamos el rol de superusuario
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  // 2. Obtener posibles Managers (Usuarios activos de la misma empresa)
  // Excluimos al usuario actual si quisieramos, pero dejémoslo simple.
  const potentialManagers = await prisma.user.findMany({
    where: {
      companyId,
      status: "ACTIVE"
    },
    select: { id: true, name: true, email: true, position: true },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({
    roles,
    managers: potentialManagers
  });
}