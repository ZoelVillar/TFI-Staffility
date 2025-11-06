"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CreateCampaignDialog from "./CreateCampaignDialog";

type CampaignRow = {
  id: string;
  name: string;
  scope: "ALL" | "TEAMS";
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
  createdBy?: { id: string; name: string | null; email: string };
  targets: { teamId: string; name?: string | null }[];
  participation: { target: number; responded: number; pct: number };
};

type ExpiringSoon = { id: string; name: string; endDate: string };

type TeamParticipation = {
  teamId: string;
  teamName: string;
  participation: number;
};

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString();
}

export default function SurveysView() {
  const [items, setItems] = useState<CampaignRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // filtros
  const [status, setStatus] = useState<"" | "ACTIVE" | "CLOSED">("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");

  // KPIs
  const [expiringSoon, setExpiringSoon] = useState<ExpiringSoon[]>([]);
  const [teamKpi, setTeamKpi] = useState<TeamParticipation[]>([]);

  const queryStr = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (teamId) p.set("teamId", teamId);
    p.set("take", "20");
    return p.toString();
  }, [status, from, to, teamId]);

  async function load(reset = true) {
    setLoading(true);
    try {
      const url = `/api/campaign?${queryStr}${
        reset || !nextCursor ? "" : `&cursor=${nextCursor}`
      }`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar campañas");
      const data = (await res.json()) as {
        campaigns: CampaignRow[];
        nextCursor: string | null;
        kpis: { expiringSoon: ExpiringSoon[] };
      };
      setItems(reset ? data.campaigns : [...items, ...data.campaigns]);
      setNextCursor(data.nextCursor);
      setExpiringSoon(data.kpis.expiringSoon);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamKPIs() {
    const res = await fetch("/api/campaign/kpis", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        teamParticipation: TeamParticipation[];
      };
      setTeamKpi(data.teamParticipation ?? []);
    }
  }

  useEffect(() => {
    load(true);
    loadTeamKPIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => startTransition(() => load(true)), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryStr]);

  async function handleClose(id: string) {
    if (!confirm("¿Cerrar esta campaña? No podrá reabrirse.")) return;
    const res = await fetch(`/api/campaign/${id}/close`, { method: "POST" });
    if (!res.ok) {
      alert("No se pudo cerrar la campaña");
      return;
    }
    await load(true);
    await loadTeamKPIs();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* IZQUIERDA: Crear + Tabla */}
      <div className="lg:col-span-8 space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Encuestas MBI</CardTitle>
            <div className="flex gap-2">
              <CreateCampaignDialog
                onCreated={async () => {
                  await load(true);
                  await loadTeamKPIs();
                }}
              />
              <Link href="/config/encuesta" className="hidden md:inline-block">
                <Button variant="secondary" disabled>
                  Ver cuestionario MBI
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select
                className="border rounded-md p-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="">Estado: Todos</option>
                <option value="ACTIVE">Activa</option>
                <option value="CLOSED">Cerrada</option>
              </select>
              <input
                type="date"
                className="border rounded-md p-2 text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Desde"
              />
              <input
                type="date"
                className="border rounded-md p-2 text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Hasta"
              />
              <input
                className="border rounded-md p-2 text-sm"
                placeholder="Filtrar por TeamId (opcional)"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-muted/30">
                    <th className="py-3 pl-4">Campaña</th>
                    <th>Alcance</th>
                    <th>Envío</th>
                    <th>Participación</th>
                    <th>Estado</th>
                    <th>Creación</th>
                    <th>Fin</th>
                    <th className="pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3 pl-4">{c.name}</td>
                      <td>
                        {c.scope === "ALL" ? (
                          <span className="text-xs rounded-full bg-slate-100 px-2 py-1 border">
                            Todos
                          </span>
                        ) : (
                          <div className="flex gap-1 flex-wrap">
                            {c.targets.map((t) => (
                              <span
                                key={t.teamId}
                                className="text-xs rounded-full bg-slate-100 px-2 py-1 border"
                              >
                                {t.name ?? "Team"}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>{fmtDate(c.startDate)}</td>
                      <td>
                        <span className="font-medium">
                          {c.participation.pct}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({c.participation.responded}/{c.participation.target})
                        </span>
                      </td>
                      <td>
                        <span
                          className={`text-xs px-2 py-1 rounded-full border ${
                            c.status === "ACTIVE"
                              ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {c.status === "ACTIVE" ? "En curso" : "Finalizada"}
                        </span>
                      </td>
                      <td>{fmtDate(c.createdAt)}</td>
                      <td>{fmtDate(c.endDate)}</td>
                      <td className="pr-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/surveys/${c.id}/results`}>
                            <Button size="sm" variant="secondary">
                              Ver panel
                            </Button>
                          </Link>
                          {c.status === "ACTIVE" && (
                            <Button size="sm" onClick={() => handleClose(c.id)}>
                              Cerrar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Sin campañas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center p-4">
              {nextCursor && (
                <Button
                  variant="outline"
                  onClick={() => load(false)}
                  disabled={loading || isPending}
                >
                  {loading ? "Cargando..." : "Cargar más"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DERECHA: KPIs */}
      <aside className="lg:col-span-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Participación por equipo (hoy)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamKpi.slice(0, 6).map((t) => (
              <div key={t.teamId}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.teamName}</span>
                  <span className="font-medium">{t.participation}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-primary/80"
                    style={{
                      width: `${Math.min(100, Math.max(0, t.participation))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {teamKpi.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay campañas activas con equipos.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos vencimientos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringSoon.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
              >
                <span className="truncate">{c.name}</span>
                <span className="text-muted-foreground">
                  {fmtDate(c.endDate)}
                </span>
              </div>
            ))}
            {expiringSoon.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay campañas por vencer en 7 días.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
