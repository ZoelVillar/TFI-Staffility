// app/api/manage/workload/history/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { subWeeks } from "date-fns";

export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();

  // Seguridad: Solo managers o admins
  if (!hasAnyPermission(user, [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE])) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId"); // Opcional: filtrar por un empleado específico
  const weeksBack = 12; // Últimas 12 semanas (trimestre)

  const since = subWeeks(new Date(), weeksBack);

  // Buscar snapshots
  const snapshots = await prisma.workloadSnapshot.findMany({
    where: {
      weekStart: { gte: since },
      user: { 
        companyId, // Scopear por empresa
        ...(userId ? { id: userId } : {}) // Scopear por usuario si se pide
      }
    },
    orderBy: { weekStart: "asc" },
    select: {
      weekStart: true,
      utilizationPct: true,
      riskLevel: true,
      burnoutScore: true,
      userId: true,
      user: { select: { name: true } } // Para agrupar si vemos historial de equipo
    }
  });

  // Agregación simple: Promedio semanal de utilización del equipo (si no hay userId)
  // Si hay userId, devolvemos la serie directa.
  
  if (userId) {
    return NextResponse.json({ history: snapshots });
  }

  // Agrupación por semana para gráfico de equipo
  const weeklyMap = new Map<string, { 
    date: string; 
    totalUtil: number; 
    count: number; 
    avgBurnout: number; 
    burnoutCount: number 
  }>();

  snapshots.forEach(s => {
    const key = s.weekStart.toISOString();
    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, { date: key, totalUtil: 0, count: 0, avgBurnout: 0, burnoutCount: 0 });
    }
    const entry = weeklyMap.get(key)!;
    entry.totalUtil += s.utilizationPct;
    entry.count += 1;
    if (s.burnoutScore) {
        entry.avgBurnout += Number(s.burnoutScore);
        entry.burnoutCount += 1;
    }
  });

  const aggregated = Array.from(weeklyMap.values()).map(w => ({
    weekStart: w.date,
    avgUtilization: Math.round(w.totalUtil / w.count),
    avgBurnout: w.burnoutCount > 0 ? Math.round((w.avgBurnout / w.burnoutCount) * 100) / 100 : null
  }));

  return NextResponse.json({ history: aggregated });
}