"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Participant = {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
  image: string | null;
  teams: { id: string; name: string }[];
  responded: boolean;
  score: number | null; // 0-100
  submittedAt: string | null;
};

type ByTeam = {
  teamId: string;
  teamName: string;
  participation: number;
  avgScore: number;
};

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleString() : "—";
}

export default function CampaignResultsView({
  campaignId,
}: {
  campaignId: string;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [kpis, setKpis] = useState<{
    target: number;
    responded: number;
    notResponded: number;
    participation: number;
    avgScore: number;
  } | null>(null);
  const [camp, setCamp] = useState<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: "ACTIVE" | "CLOSED";
    scope: "ALL" | "TEAMS";
  } | null>(null);
  const [byTeam, setByTeam] = useState<ByTeam[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    // participantes + KPIs
    const res = await fetch(`/api/campaign/${campaignId}/participants`, {
      cache: "no-store",
    });
    if (!res.ok) {
      alert("No se pudo cargar participantes");
      return;
    }
    const data = await res.json();
    setCamp(data.campaign);
    setKpis(data.kpis);
    setParticipants(data.participants);

    // resultados agregados (byTeam) para el gráfico
    const r2 = await fetch(`/api/campaign/${campaignId}/results`, {
      cache: "no-store",
    });
    if (r2.ok) {
      const d2 = await r2.json();
      setByTeam(d2.byTeam ?? []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return participants;
    return participants.filter(
      (p) =>
        p.name?.toLowerCase().includes(t) ||
        p.email.toLowerCase().includes(t) ||
        p.position?.toLowerCase().includes(t) ||
        p.teams.some((tm) => tm.name.toLowerCase().includes(t))
    );
  }, [participants, q]);

  return (
    <div className="space-y-6">
      {/* Header/KPIs */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle>
            {camp?.name} · {camp?.status === "ACTIVE" ? "En curso" : "Cerrada"}{" "}
            · Fin: {fmtDate(camp?.endDate)}
          </CardTitle>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Buscar por nombre, email, team..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-72"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">Target</div>
              <div className="text-2xl font-semibold">{kpis?.target ?? 0}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">Respondieron</div>
              <div className="text-2xl font-semibold">
                {kpis?.responded ?? 0}
              </div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">Participación</div>
              <div className="text-2xl font-semibold">
                {kpis?.participation ?? 0}%
              </div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">
                Score promedio
              </div>
              <div className="text-2xl font-semibold">
                {kpis?.avgScore ?? 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico: Estrés promedio por equipo */}
      <Card>
        <CardHeader>
          <CardTitle>Estrés promedio por equipo (0–100)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          {byTeam.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byTeam.map((t) => ({
                  name: t.teamName,
                  score: Math.round(t.avgScore),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide={false} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay datos por equipo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabla de participantes */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados y estado de respuesta</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-muted/30">
                  <th className="py-3 pl-4">Empleado</th>
                  <th>Equipos</th>
                  <th>Rol</th>
                  <th>Fecha de envío</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-3 pl-4">
                      <div className="leading-tight">
                        <div className="font-medium">{p.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.email}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[260px]">
                      <div className="flex gap-1 flex-wrap">
                        {p.teams.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          p.teams.map((t) => (
                            <span
                              key={t.id}
                              className="text-xs rounded-full bg-slate-100 px-2 py-0.5 border"
                            >
                              {t.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>{p.position ?? "—"}</td>
                    <td>{fmtDate(p.submittedAt)}</td>
                    <td>
                      {p.responded ? (
                        <span className="text-xs px-2 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
                          {p.score}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full border bg-rose-50 border-rose-200 text-rose-700">
                          Sin respuesta
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No hay participantes para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
