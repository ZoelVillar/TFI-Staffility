"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type User = {
  id: string;
  name: string | null;
  role: { name: string };
  companyId: string;
};

export default function DashboardView({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/dashboard?role=${user.role.name}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setData(json);
      setLoading(false);
    })();
  }, [user.role.name]);

  if (loading) return <Skeleton className="h-[600px]" />;

  const role = user.role.name.toUpperCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            👋 Bienvenido {user.name ?? "Usuario"} —{" "}
            {role === "ADMIN"
              ? "Panel General"
              : role === "MANAGER"
              ? "Panel del Equipo"
              : "Mi Panel"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            label="Burnout promedio"
            value={`${data.burnoutAvg}%`}
            color={riskColor(data.burnoutAvg)}
          />
          <Kpi
            label="Utilización promedio"
            value={`${data.utilizationAvg}%`}
            color={riskColor(data.utilizationAvg)}
          />
          <Kpi
            label="Participación en encuestas"
            value={`${data.participation}%`}
            color="bg-blue-50 text-blue-700 border-blue-200"
          />
          <Kpi
            label="Equipos en riesgo"
            value={`${data.teamsAtRisk}%`}
            color="bg-amber-50 text-amber-700 border-amber-200"
          />
        </CardContent>
      </Card>

      {/* CORRELACIÓN BURNOUT VS CARGA */}
      <Card>
        <CardHeader>
          <CardTitle>Burnout vs Carga laboral</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterPlot data={data.burnoutVsWorkload} />
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* EVOLUCIÓN TEMPORAL */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución semanal del bienestar</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.weeklyTrend}>
              <defs>
                <linearGradient id="burnout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="workload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="burnout"
                stroke="#ef4444"
                fill="url(#burnout)"
              />
              <Area
                type="monotone"
                dataKey="workload"
                stroke="#3b82f6"
                fill="url(#workload)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={cn("border rounded-xl px-4 py-3 text-center", color)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function riskColor(v: number) {
  if (v > 100 || v > 70) return "bg-rose-50 text-rose-700 border-rose-200";
  if (v > 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function ScatterPlot({ data }: { data: any[] }) {
  return (
    <BarChart data={data}>
      <XAxis dataKey="team" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="burnout" fill="#f87171" name="Burnout" />
      <Bar dataKey="workload" fill="#60a5fa" name="Carga laboral" />
    </BarChart>
  );
}
