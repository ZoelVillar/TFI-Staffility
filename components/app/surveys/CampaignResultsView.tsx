"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRiskInfo } from "@/lib/survey";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
type RadarPoint = { subject: string; score: number; fullMark: number };

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleString() : "—";
}

export default function CampaignResultsView({
  campaignId,
}: {
  campaignId: string;
}) {
  const [radarData, setRadarData] = useState<RadarPoint[]>([]); // Estado para el radar
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
      setRadarData(d2.radarData ?? []); // Cargar datos del radar
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

      {/* GRÁFICOS: Layout en Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Gráfico de Barras por Equipo */}
        <Card>
          <CardHeader>
            <CardTitle>Estrés promedio por equipo</CardTitle>
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

        {/* 2. NUEVO: Análisis Dimensional (Radar) */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Factores de Riesgo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Desglose de las dimensiones que más impactan al equipo.
            </p>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  data={radarData}
                >
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Equipo"
                    dataKey="score"
                    stroke="#f97316" /* Orange-500 */
                    fill="#f97316"
                    fillOpacity={0.4}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Faltan datos para generar el análisis dimensional.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                        (() => {
                          const score = p.score ?? 0;
                          const risk = getRiskInfo(score);
                          return (
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${risk.color}`}>
                                {score}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border bg-white ${risk.color} border-current opacity-80`}
                              >
                                {risk.level}
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Pendiente
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