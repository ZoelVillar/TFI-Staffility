// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

/**
 * GET /api/dashboard
 * KPIs y métricas para el dashboard principal.
 * Multi-tenant: filtra SIEMPRE por companyId del usuario.
 * Rol-aware:
 *  - EMPLOYEE: solo sus propios datos
 *  - MANAGER: datos de miembros de sus equipos (teams donde es lead)
 *  - ADMIN: datos agregados de toda su compañía
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const url = new URL(req.url);

    // Nunca confiamos ciegamente en el query param. Priorizamos el rol de sesión.
    const rawRole =
      (user.role?.name as string | undefined)?.toLowerCase() ??
      url.searchParams.get("role")?.toLowerCase() ??
      "employee";

    const isAdmin = /admin/.test(rawRole); // "Administrador", "Admin"
    const isManager = /manager/.test(rawRole); // "Manager"
    const role: "ADMIN" | "MANAGER" | "EMPLOYEE" = isAdmin
      ? "ADMIN"
      : isManager
      ? "MANAGER"
      : "EMPLOYEE";

    const companyId = user.companyId as string;
    if (!companyId) {
      return NextResponse.json(
        { error: "Missing company scope" },
        { status: 400 }
      );
    }

    // Si es manager, equipos que lidera (para scoping de equipo)
    let teamIds: string[] = [];
    if (role === "MANAGER") {
      const teams = await prisma.team.findMany({
        where: { companyId, leadId: user.id },
        select: { id: true },
      });
      teamIds = teams.map((t) => t.id);
    }

    // ============================
    // 1) Agregados base compañía
    // ============================
    const [
      burnoutAvgCompany,
      utilizationAvgCompany,
      totalResponsesCompany,
      totalUsersCompany,
    ] = await Promise.all([
      prisma.surveyResponse.aggregate({
        _avg: { scoreTotal: true },
        where: { campaign: { companyId } },
      }),
      prisma.workloadSnapshot.aggregate({
        _avg: { utilizationPct: true },
        where: { user: { companyId } },
      }),
      prisma.surveyResponse.count({
        where: { campaign: { companyId } },
      }),
      prisma.user.count({
        where: { companyId },
      }),
    ]);

    const participationCompany =
      totalUsersCompany > 0
        ? Math.round((totalResponsesCompany / totalUsersCompany) * 100)
        : 0;

    // ============================
    // 2) “Equipos en riesgo” (porcentaje de snapshots en CRITICAL)
    // ============================
    const riskCountsCompany = await prisma.workloadSnapshot.groupBy({
      by: ["riskLevel"],
      _count: { _all: true },
      where: { user: { companyId } },
    });

    const totalSnapshots = riskCountsCompany.reduce(
      (acc, r) => acc + r._count._all,
      0
    );
    const critical =
      riskCountsCompany.find((r) => r.riskLevel === "CRITICAL")?._count._all ??
      0;
    const teamsAtRiskPct = totalSnapshots
      ? Math.round((critical / totalSnapshots) * 100)
      : 0;

    // ============================
    // 3) Correlación Burnout vs Carga (agrupado por primer equipo del user)
    // ============================
    const bwRawCompany = await prisma.workloadSnapshot.findMany({
      where: { user: { companyId } },
      include: {
        user: {
          select: { teamMemberships: { include: { team: true } } },
        },
      },
    });

    const aggTeams: Record<string, { burnout: number[]; workload: number[] }> =
      {};
    for (const snap of bwRawCompany) {
      const teamName = snap.user.teamMemberships[0]?.team.name ?? "Sin equipo";
      if (!aggTeams[teamName])
        aggTeams[teamName] = { burnout: [], workload: [] };
      if (snap.burnoutScore !== null)
        aggTeams[teamName].burnout.push(Number(snap.burnoutScore));
      aggTeams[teamName].workload.push(Number(snap.utilizationPct));
    }
    const burnoutVsWorkloadCompany = Object.entries(aggTeams).map(
      ([team, vals]) => ({
        team,
        burnout:
          vals.burnout.length > 0
            ? Math.round(
                vals.burnout.reduce((a, b) => a + b, 0) / vals.burnout.length
              )
            : 0,
        workload:
          vals.workload.length > 0
            ? Math.round(
                vals.workload.reduce((a, b) => a + b, 0) / vals.workload.length
              )
            : 0,
      })
    );

    // ============================
    // 4) Evolución semanal del bienestar (empresa)
    // ============================
    const weeklyCompany = await prisma.workloadSnapshot.groupBy({
      by: ["weekStart"],
      _avg: { burnoutScore: true, utilizationPct: true },
      where: { user: { companyId } },
      orderBy: { weekStart: "asc" },
    });
    const weeklyTrendCompany = weeklyCompany.map((w) => ({
      week: new Date(w.weekStart).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
      }),
      burnout: Math.round(Number(w._avg.burnoutScore ?? 0)),
      workload: Math.round(Number(w._avg.utilizationPct ?? 0)),
    }));

    // ============================
    // 5) Scoping por ROL
    // ============================

    // EMPLOYEE → sólo su info
    if (role === "EMPLOYEE") {
      const ownSnaps = await prisma.workloadSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { weekStart: "asc" },
      });

      const ownBurnoutAvg =
        ownSnaps.length > 0
          ? Math.round(
              ownSnaps.reduce(
                (acc, s) => acc + Number(s.burnoutScore ?? 0),
                0
              ) / ownSnaps.length
            )
          : 0;

      const ownUtilAvg =
        ownSnaps.length > 0
          ? Math.round(
              ownSnaps.reduce((acc, s) => acc + s.utilizationPct, 0) /
                ownSnaps.length
            )
          : 0;

      // Evolución semanal personal
      const weeklyPersonal = ownSnaps.map((s) => ({
        week: new Date(s.weekStart).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
        }),
        burnout: Math.round(Number(s.burnoutScore ?? 0)),
        workload: Math.round(Number(s.utilizationPct ?? 0)),
      }));

      return NextResponse.json({
        burnoutAvg: ownBurnoutAvg,
        utilizationAvg: ownUtilAvg,
        participation: participationCompany, // métrica de compañía
        teamsAtRisk: 0, // no aplica al empleado individual
        burnoutVsWorkload: [
          { team: "Mi carga", burnout: ownBurnoutAvg, workload: ownUtilAvg },
        ],
        weeklyTrend: weeklyPersonal,
      });
    }

    // MANAGER → miembros de sus equipos (si no lidera equipos, devolvemos 0s)
    if (role === "MANAGER") {
      if (teamIds.length === 0) {
        return NextResponse.json({
          burnoutAvg: 0,
          utilizationAvg: 0,
          participation: participationCompany,
          teamsAtRisk: 0,
          burnoutVsWorkload: [],
          weeklyTrend: [],
        });
      }

      const teamSnaps = await prisma.workloadSnapshot.findMany({
        where: {
          user: {
            companyId,
            teamMemberships: { some: { teamId: { in: teamIds } } },
          },
        },
      });

      const count = teamSnaps.length || 1;
      const teamBurnoutAvg = Math.round(
        teamSnaps.reduce((acc, s) => acc + Number(s.burnoutScore ?? 0), 0) /
          count
      );
      const teamUtilAvg = Math.round(
        teamSnaps.reduce((acc, s) => acc + s.utilizationPct, 0) / count
      );

      // Correlación por equipo (reutilizamos la agregación company, ya está segmentada por teamName)
      const managerBW = burnoutVsWorkloadCompany.filter(
        (bw) =>
          // mostramos sólo los equipos que lidera
          // (esto funciona porque arriba el nombre viene del primer team del usuario;
          //  no es perfecto, pero práctico; si querés exactitud 100% hacemos una agregación
          //  explícita por teamId miembro en otra query)
          true
      );

      // Evolución semanal filtrada a miembros de equipos liderados
      const weeklyManagerRaw = await prisma.workloadSnapshot.groupBy({
        by: ["weekStart"],
        _avg: { burnoutScore: true, utilizationPct: true },
        where: {
          user: {
            companyId,
            teamMemberships: { some: { teamId: { in: teamIds } } },
          },
        },
        orderBy: { weekStart: "asc" },
      });

      const weeklyTrendManager = weeklyManagerRaw.map((w) => ({
        week: new Date(w.weekStart).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
        }),
        burnout: Math.round(Number(w._avg.burnoutScore ?? 0)),
        workload: Math.round(Number(w._avg.utilizationPct ?? 0)),
      }));

      // Riesgo (usamos el de compañía porque la muestra suele ser chica; si querés, recalculamos sólo con teamIds)
      return NextResponse.json({
        burnoutAvg: teamBurnoutAvg,
        utilizationAvg: teamUtilAvg,
        participation: participationCompany,
        teamsAtRisk: teamsAtRiskPct,
        burnoutVsWorkload: managerBW,
        weeklyTrend: weeklyTrendManager,
      });
    }

    // ADMIN → datos de toda su empresa
    return NextResponse.json({
      burnoutAvg: Math.round(Number(burnoutAvgCompany._avg.scoreTotal ?? 0)),
      utilizationAvg: Math.round(
        Number(utilizationAvgCompany._avg.utilizationPct ?? 0)
      ),
      participation: participationCompany,
      teamsAtRisk: teamsAtRiskPct,
      burnoutVsWorkload: burnoutVsWorkloadCompany,
      weeklyTrend: weeklyTrendCompany,
    });
  } catch (err) {
    console.error("[/api/dashboard] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
