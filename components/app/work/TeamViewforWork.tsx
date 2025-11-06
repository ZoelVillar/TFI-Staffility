"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TeamCardDTO = {
  id: string;
  name: string;
  description: string | null;
  leadId: string | null;
  lead: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  _count: { memberships: number };
};

type Kpis = {
  avgUtilization: number; // promedio de utilización (%) entre todos los equipos
  attentionTeams: number; // equipos con >85% utilización
  criticalTeams: number; // equipos con >100%
  totalMembers: number; // miembros totales entre todos los equipos
};

export default function TeamViewforWork() {
  const [teams, setTeams] = useState<TeamCardDTO[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    avgUtilization: 0,
    attentionTeams: 0,
    criticalTeams: 0,
    totalMembers: 0,
  });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/team/my?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudieron cargar equipos");
      const data = (await res.json()) as {
        teams: TeamCardDTO[];
        kpis: { totalTeams: number; totalMembers: number; teamsLead: number };
      };

      setTeams(data.teams);

      // Simulación de KPIs laborales agregados (pueden venir de /api/manage/workload/overview)
      // Por ahora los calculamos proporcionalmente al total
      const avgUtilization = Math.round(75 + Math.random() * 20); // placeholder
      const attentionTeams = Math.floor(data.teams.length * 0.3);
      const criticalTeams = Math.floor(data.teams.length * 0.1);

      setKpis({
        avgUtilization,
        attentionTeams,
        criticalTeams,
        totalMembers: data.kpis.totalMembers,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Izquierda: listado de equipos */}
      <div className="lg:col-span-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Gestión de carga laboral — Equipos</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <Input
                placeholder="Buscar equipo por nombre..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((t) => (
            <Link key={t.id} href={`/team/${t.id}/workload`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {t.description ?? "—"}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Miembros:{" "}
                    <span className="font-medium">{t._count.memberships}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Líder:{" "}
                    <span className="font-medium">{t.lead?.name ?? "—"}</span>
                  </div>
                  <div className="pt-1 text-xs text-muted-foreground">
                    <span className="text-primary font-medium">
                      Ver carga laboral →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {teams.length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Sin equipos asignados
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Derecha: KPIs laborales */}
      <aside className="lg:col-span-4 space-y-4">
        <Card className="bg-gradient-to-br from-muted/40 to-background border-muted/50">
          <CardHeader>
            <CardTitle>KPIs de carga laboral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Kpi
                label="Utilización promedio"
                value={`${kpis.avgUtilization}%`}
              />
              <Kpi label="Equipos en atención" value={kpis.attentionTeams} />
              <Kpi label="Equipos críticos" value={kpis.criticalTeams} />
              <Kpi label="Miembros totales" value={kpis.totalMembers} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => load()}>
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
