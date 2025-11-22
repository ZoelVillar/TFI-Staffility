// app/api/dashboard/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  // Ejemplo simple
  const [burnoutAvg, utilizationAvg, participation] = await Promise.all([
    prisma.surveyResponse.aggregate({ _avg: { scoreTotal: true } }),
    prisma.workloadSnapshot.aggregate({ _avg: { utilizationPct: true } }),
    prisma.surveyResponse.count(),
  ]);

  const teamsAtRisk = await prisma.workloadSnapshot.groupBy({
    by: ["riskLevel"],
    _count: { _all: true },
  });

  const data = {
    burnoutAvg: Number(burnoutAvg._avg.scoreTotal?.toFixed(1) ?? 0),
    utilizationAvg: Math.round(utilizationAvg._avg.utilizationPct ?? 0),
    participation: Math.round((participation / 100) * 100),
    teamsAtRisk:
      teamsAtRisk.find((t) => t.riskLevel === "CRITICAL")?._count._all ?? 0,
    burnoutVsWorkload: [
      { team: "Backend", burnout: 70, workload: 95 },
      { team: "Frontend", burnout: 55, workload: 75 },
      { team: "QA", burnout: 40, workload: 65 },
    ],
    weeklyTrend: [
      { week: "Sep 1", burnout: 55, workload: 78 },
      { week: "Sep 8", burnout: 57, workload: 80 },
      { week: "Sep 15", burnout: 61, workload: 86 },
      { week: "Sep 22", burnout: 64, workload: 90 },
    ],
  };

  return NextResponse.json(data);
}
