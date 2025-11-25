// components/app/work/TeamWorkloadView.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { startOfISOWeek, addWeeks, subWeeks, format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import TeamHeatmap from "./TeamHeatmap"; // Asegúrate que este componente exista (Fase C)

// Tipos del backend
type WorkloadUser = {
  id: string;
  name: string;
  image: string | null;
  capacityHoursPerWeek: number | null;
  stats: {
    plannedHours: number;
    capacity: number;
    utilization: number;
    risk: "OK" | "ATTENTION" | "CRITICAL";
    activeCount: number;
    blockedCount: number;
  };
};

type TeamResponse = {
  weekStart: string;
  users: WorkloadUser[];
};

export default function TeamWorkloadView({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorkloadUser[]>([]);
  const [weekStart, setWeekStart] = useState(startOfISOWeek(new Date()));
  const [teamName, setTeamName] = useState("Equipo");

  // Tareas crudas para el heatmap
  const [rawTasks, setRawTasks] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      // 1. Datos Agregados (KPIs)
      const resSummary = await fetch(`/api/manage/workload/summary?teamId=${teamId}&week=${weekStart.toISOString()}`);
      if (resSummary.ok) {
        const summaryData: TeamResponse = await resSummary.json();
        setData(summaryData.users);
      }

      // 2. Tareas Crudas para Heatmap (Rango Semanal)
      const rangeEnd = addDays(weekStart, 7).toISOString();
      const resTasks = await fetch(`/api/tasks?teamId=${teamId}&from=${weekStart.toISOString()}&to=${rangeEnd}&take=200`);
      if (resTasks.ok) {
        const tasksData = await resTasks.json();
        setRawTasks(tasksData.items);
      }

      // 3. Info del Team (Nombre)
      const resTeam = await fetch(`/api/team/${teamId}`);
      if (resTeam.ok) {
        const t = await resTeam.json();
        setTeamName(t.team.name);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [teamId, weekStart]);

  if (loading && data.length === 0) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  // KPIs Locales
  const totalActive = data.reduce((a, u) => a + u.stats.activeCount, 0);
  const totalBlocked = data.reduce((a, u) => a + u.stats.blockedCount, 0);
  // Promedio de utilización
  const teamUtil = data.length > 0 ? Math.round(data.reduce((a, u) => a + u.stats.utilization, 0) / data.length) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/team/workload" className="hover:underline">← Volver al panel global</Link>
          </div>
          <h1 className="text-2xl font-bold">{teamName}</h1>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(d => subWeeks(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-[140px] text-center">
            {format(weekStart, "d 'de' MMMM", { locale: es })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(d => addWeeks(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Carga del Equipo</p>
                <div className="text-2xl font-bold mt-1">{teamUtil}%</div>
              </div>
              <div className={`p-2 rounded-full ${teamUtil > 100 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tareas Activas</p>
                <div className="text-2xl font-bold mt-1">{totalActive}</div>
              </div>
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Loader2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bloqueos</p>
                <div className="text-2xl font-bold mt-1 text-red-600">{totalBlocked}</div>
              </div>
              <div className="p-2 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Section */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-3">
          <CardTitle className="text-base">Disponibilidad Semanal</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TeamHeatmap
            members={data.map(u => ({ id: u.id, name: u.name, image: u.image, capacityHoursPerWeek: u.capacityHoursPerWeek }))}
            tasks={rawTasks}
            weekStart={weekStart}
            hoursPerSP={5} // Default
          />
        </CardContent>
      </Card>

      {/* Lista detallada de miembros y sus métricas */}
      <div className="grid grid-cols-1 gap-4">
        <h3 className="text-lg font-semibold">Detalle por Miembro</h3>
        {data.map(u => (
          <Card key={u.id} className="flex flex-col sm:flex-row items-center p-4 gap-4 justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                {u.image && <img src={u.image} alt={u.name} className="h-full w-full object-cover" />}
              </div>
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.stats.activeCount} tareas activas • {u.stats.blockedCount} bloqueos</div>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full sm:w-auto">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Planificado</div>
                <div className="font-semibold">{u.stats.plannedHours}h <span className="text-muted-foreground font-normal">/ {u.stats.capacity}h</span></div>
              </div>

              <div className="w-32">
                <div className="flex justify-between text-xs mb-1">
                  <span>Utilización</span>
                  <span className={u.stats.utilization > 100 ? "text-red-600 font-bold" : ""}>{u.stats.utilization}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${u.stats.risk === 'CRITICAL' ? 'bg-red-500' : u.stats.risk === 'ATTENTION' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(u.stats.utilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}