"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

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
type Kpis = { totalTeams: number; totalMembers: number; teamsLead: number };

export default function TeamsView() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamCardDTO[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    totalTeams: 0,
    totalMembers: 0,
    teamsLead: 0,
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

      console.log("Fetching teams with params:", params.toString());
      console.log("Response status:", res);
      if (!res.ok) throw new Error("No se pudieron cargar equipos");
      const data = (await res.json()) as { teams: TeamCardDTO[]; kpis: Kpis };
      setTeams(data.teams);
      setKpis(data.kpis);

      console.log("Loaded teams:", data.teams);
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
      {/* Izquierda: grid de cards */}
      <div className="lg:col-span-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Mis equipos</CardTitle>
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
            <Link key={t.id} href={`/team/${t.id}`}>
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
                </CardContent>
              </Card>
            </Link>
          ))}
          {teams.length === 0 && !loading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Sin equipos
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Derecha: KPIs + Agregar team */}
      <aside className="lg:col-span-4 space-y-4">
        <Card className="bg-gradient-to-br from-muted/40 to-background border-muted/50">
          <CardHeader>
            <CardTitle>KPIs de equipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Total equipos" value={kpis.totalTeams} />
              <Kpi label="Total miembros" value={kpis.totalMembers} />
              <Kpi label="Equipos que lidero" value={kpis.teamsLead} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/team/new">
              <Button>Agregar team</Button>
            </Link>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
