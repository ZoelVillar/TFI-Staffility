// components/app/work/TeamViewforWork.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { startOfISOWeek, format, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; // Asegúrate de tener este componente o usa un div simple
import {
  Loader2,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

type TeamSummary = {
  id: string;
  name: string;
  members: number;
  avgUtilization: number;
  blocked: number;
  criticalMembers: number;
};

export default function TeamViewforWork() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [weekStart, setWeekStart] = useState(startOfISOWeek(new Date()));

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/manage/workload/summary?week=${weekStart.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [weekStart]);

  // KPIs Globales
  const totalBlocked = teams.reduce((a, b) => a + b.blocked, 0);
  const globalUtil =
    teams.length > 0
      ? Math.round(
          teams.reduce((a, b) => a + b.avgUtilization, 0) / teams.length
        )
      : 0;
  const teamsAtRisk = teams.filter(
    (t) => t.avgUtilization > 90 || t.criticalMembers > 0
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header con Navegación de Semanas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Carga
          </h1>
          <p className="text-muted-foreground">
            Panorama general de la salud operativa de los equipos.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((d) => subWeeks(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(weekStart, "d 'de' MMMM", { locale: es })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((d) => addWeeks(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={globalUtil > 90 ? "border-red-200 bg-red-50/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilización Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{globalUtil}%</span>
              <span className="text-sm text-muted-foreground mb-1">
                capacidad
              </span>
            </div>
            <Progress
              value={globalUtil}
              className={`h-2 mt-2 ${
                globalUtil > 90 ? "bg-red-200 [&>div]:bg-red-500" : ""
              }`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Equipos en Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-3xl font-bold">{teamsAtRisk}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Con miembros sobrecargados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tareas Bloqueadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalBlocked}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En toda la organización
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Listado de Equipos (Cards Mejoradas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : teams.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10 border-dashed">
            <Users className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
            <h3 className="text-lg font-medium text-foreground">
              Sin equipos asignados
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              No formas parte de ningún equipo actualmente. Contacta a tu
              manager para que te asigne.
            </p>
          </div>
        ) : (
          teams.map((team) => (
            <Link
              key={team.id}
              href={`/team/${team.id}/workload`}
              className="group"
            >
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer relative overflow-hidden">
                {team.avgUtilization > 100 && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                )}
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {team.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {team.members} miembros
                      </div>
                    </div>
                    {team.avgUtilization > 100 ? (
                      <Badge variant="destructive">Sobrecarga</Badge>
                    ) : team.avgUtilization > 85 ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                      >
                        Atención
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 bg-emerald-50"
                      >
                        Saludable
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">
                          Carga promedio
                        </span>
                        <span className="font-medium">
                          {team.avgUtilization}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            team.avgUtilization > 100
                              ? "bg-red-500"
                              : team.avgUtilization > 85
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(team.avgUtilization, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        {team.criticalMembers > 0 ? (
                          <span className="text-red-600 font-medium">
                            {team.criticalMembers} miembro(s) crítico(s)
                          </span>
                        ) : (
                          <span>Carga equilibrada</span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
