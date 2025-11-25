// app/api/team/my/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  // 1. Definir quién puede ver TODOS los equipos (Solo Admins reales)
  // "Administrador" suele tener COMPANIES_MANAGE o USERS_MANAGE a nivel global.
  const isGlobalAdmin = hasAnyPermission(user, [
    PERMISSIONS.COMPANIES_MANAGE,
    PERMISSIONS.SYSTEM_COMPANIES_MANAGE,
  ]);

  // Managers y Empleados ven solo sus equipos (aunque tengan TEAM_VIEW)
  // TEAM_MANAGE permite gestionar TU equipo, no necesariamente ver todos.
  const canViewAll = isGlobalAdmin;

  let teams = [];

  const selectFields = {
    id: true,
    name: true,
    description: true,
    leadId: true,
    lead: { select: { id: true, name: true, email: true, image: true } },
    _count: { select: { memberships: true } },
    createdAt: true,
  };

  if (canViewAll) {
    // CASO 1: Admin -> Ve todos los equipos de la empresa
    teams = await prisma.team.findMany({
      where: {
        companyId,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: selectFields,
      orderBy: { name: "asc" },
    });
  } else {
    // CASO 2: Manager o Empleado -> Ve solo equipos donde es miembro o líder
    // Usamos la relación inversa desde Team para filtrar
    teams = await prisma.team.findMany({
      where: {
        companyId,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        // Condición crítica: Debe estar en la tabla de membresías
        memberships: {
          some: { userId: user.id },
        },
      },
      select: selectFields,
      orderBy: { name: "asc" },
    });
  }

  // Calcular KPIs en tiempo real sobre los equipos VISIBLES
  const kpis = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((a, t) => a + t._count.memberships, 0),
    teamsLead: teams.filter((t) => t.leadId === user.id).length,
    avgMembers:
      teams.length > 0
        ? Math.round(
            teams.reduce((a, t) => a + t._count.memberships, 0) / teams.length
          )
        : 0,
  };

  return NextResponse.json({
    teams,
    kpis,
    // Para el frontend: si es admin o tiene permiso de gestión, mostramos botón "Crear"
    // Pero ojo: solo si tiene el permiso explícito de crear.
    isManager: hasAnyPermission(user, [
      PERMISSIONS.TEAM_MANAGE,
      PERMISSIONS.COMPANIES_MANAGE,
    ]),
  });
}
