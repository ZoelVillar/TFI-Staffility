// components/app/work/TeamWorkloadView.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type MemberBase = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  position: string | null;
  department: string | null;
  seniority: "JR" | "SSR" | "SR" | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN" | null;
  capacityHoursPerWeek: number | null;
  capacitySpPerWeek: number | null;
  hoursPerStoryPoint: number | null;
};

type WorkloadDTO = {
  // devuelto por /api/manage/workload/user/[id]?window=week
  period: { from: string; to: string };
  plannedHours: number; // total horas planificadas en la ventana
  capacityHours: number; // capacidad resuelta (horas) del usuario para la ventana
  dueSoon: number; // tareas que vencen <= 3 días
  overdue: number; // tareas vencidas no completadas
};

type TeamPayload = {
  team: { id: string; name: string; description: string | null };
  // miembros del team (por TeamMembership) scopiados al companyId del requester
  members: MemberBase[];
};

export default function TeamWorkloadView({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<TeamPayload["team"] | null>(null);
  const [members, setMembers] = useState<MemberBase[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "ON_LEAVE"
  >("ALL");
  const [seniority, setSeniority] = useState<"ALL" | "JR" | "SSR" | "SR">(
    "ALL"
  );
  const [isPending, startTransition] = useTransition();

  // workloads por usuario (cache local)
  const [workloads, setWorkloads] = useState<
    Record<string, WorkloadDTO | null>
  >({});

  function defaultHoursByEmploymentType(et?: string | null) {
    switch (et) {
      case "FULL_TIME":
        return 40;
      case "PART_TIME":
        return 20;
      case "CONTRACTOR":
        return 30;
      case "INTERN":
        return 15;
      default:
        return 40;
    }
  }

  // carga team + miembros
  async function loadTeamMembers(signal?: AbortSignal) {
    setLoading(true);
    try {
      const res = await fetch(`/api/team/${teamId}/members`, {
        cache: "no-store",
        signal,
      });
      if (!res.ok) throw new Error("No se pudieron cargar miembros del equipo");
      const data = (await res.json()) as TeamPayload;
      setTeam(data.team);
      setMembers(data.members);
    } finally {
      setLoading(false);
    }
  }

  // carga workload para un usuario
  async function loadWorkloadFor(userId: string) {
    try {
      const res = await fetch(
        `/api/manage/workload/user/${userId}?window=week`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("No se pudo cargar workload");
      const data = (await res.json()) as WorkloadDTO;
      setWorkloads((prev) => ({ ...prev, [userId]: data }));
    } catch (e) {
      // si falla, guardamos null para no bloquear la UI
      setWorkloads((prev) => ({ ...prev, [userId]: null }));
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadTeamMembers(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // cuando cambian los miembros, pedimos workloads (N+1; optimizable a futuro)
  useEffect(() => {
    if (members.length === 0) return;
    const ids = members.map((m) => m.id);
    startTransition(() => {
      ids.forEach((id) => loadWorkloadFor(id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  // filtros
  const filtered = useMemo(() => {
    return members.filter((m) => {
      const passQ =
        !q ||
        (m.name?.toLowerCase().includes(q.toLowerCase()) ?? false) ||
        m.email.toLowerCase().includes(q.toLowerCase()) ||
        (m.position?.toLowerCase().includes(q.toLowerCase()) ?? false) ||
        (m.department?.toLowerCase().includes(q.toLowerCase()) ?? false);

      const passStatus = status === "ALL" || m.status === status;
      const passSeniority = seniority === "ALL" || m.seniority === seniority;

      return passQ && passStatus && passSeniority;
    });
  }, [members, q, status, seniority]);

  // KPIs globales (sobre filtrados)
  const kpis = useMemo(() => {
    if (filtered.length === 0) {
      return { avgUtil: 0, attention: 0, critical: 0, dueSoon: 0, overdue: 0 };
    }
    let sumUtil = 0;
    let countUtil = 0;
    let attention = 0;
    let critical = 0;
    let dueSoon = 0;
    let overdue = 0;

    for (const m of filtered) {
      const w = workloads[m.id];
      const cap =
        w?.capacityHours ??
        m.capacityHoursPerWeek ??
        defaultHoursByEmploymentType(m.employmentType);
      const planned = w?.plannedHours ?? 0;
      const util = cap > 0 ? Math.round((planned / cap) * 100) : 0;

      if (!Number.isNaN(util)) {
        sumUtil += util;
        countUtil += 1;
      }

      // reglas: atención 86–100, críticos >100
      if (util > 100) critical += 1;
      else if (util >= 86) attention += 1;

      dueSoon += w?.dueSoon ?? 0;
      overdue += w?.overdue ?? 0;
    }
    const avgUtil = countUtil > 0 ? Math.round(sumUtil / countUtil) : 0;
    return { avgUtil, attention, critical, dueSoon, overdue };
  }, [filtered, workloads]);

  function riskBadge(util: number) {
    const cls =
      util > 100
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : util >= 86
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
    const label = util > 100 ? "Crítico" : util >= 86 ? "Atención" : "OK";
    return (
      <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>
        {label}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Izquierda: lista empleados del team */}
      <div className="lg:col-span-8 space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Carga laboral — {team?.name ?? "Equipo"}</CardTitle>
              {team?.description && (
                <p className="text-sm text-muted-foreground">
                  {team.description}
                </p>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <Input
                placeholder="Buscar por nombre, email, rol, área…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="min-w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Estado: Todos</SelectItem>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="ON_LEAVE">En licencia</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={seniority}
                onValueChange={(v: any) => setSeniority(v)}
              >
                <SelectTrigger className="min-w-[150px]">
                  <SelectValue placeholder="Seniority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Seniority: Todos</SelectItem>
                  <SelectItem value="JR">JR</SelectItem>
                  <SelectItem value="SSR">SSR</SelectItem>
                  <SelectItem value="SR">SR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Grid de tarjetas por empleado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
          {filtered.map((m) => {
            const w = workloads[m.id];
            const cap =
              w?.capacityHours ??
              m.capacityHoursPerWeek ??
              defaultHoursByEmploymentType(m.employmentType);
            const planned = w?.plannedHours ?? 0;
            const util = cap > 0 ? Math.round((planned / cap) * 100) : 0;

            return (
              <Card key={m.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border">
                        {/* Si tenés Next/Image configurado con dominios, podés migrar a <Image /> */}
                        <img
                          src={
                            m.image ||
                            `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                              m.name ?? m.email
                            )}&size=64&radius=50`
                          }
                          alt={m.name ?? m.email}
                          className="w-8 h-8 object-cover"
                        />
                      </div>
                      <div className="leading-tight">
                        <div className="font-medium">
                          {m.name ?? "Sin nombre"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.email}
                        </div>
                      </div>
                    </div>
                    <div>{riskBadge(util)}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniKpi label="Capacidad (h/sem)" value={`${cap}`} />
                    <MiniKpi label="Planificado (h)" value={`${planned}`} />
                    <MiniKpi label="% Utilización" value={`${util}%`} />
                    <MiniKpi label="Seniority" value={m.seniority ?? "—"} />
                  </div>

                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className="border-amber-200 text-amber-700"
                    >
                      Por vencer ≤ 3d: {w?.dueSoon ?? 0}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-rose-200 text-rose-700"
                    >
                      Vencidas: {w?.overdue ?? 0}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      {m.position ?? "—"}{" "}
                      {m.department ? `• ${m.department}` : ""}
                    </div>
                    <Link href={`/work/${m.id}`}>
                      <Button size="sm" variant="secondary">
                        Ver trabajo
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && !loading && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Sin miembros que coincidan con el filtro.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Derecha: KPIs del equipo */}
      <aside className="lg:col-span-4 space-y-4">
        <Card className="bg-gradient-to-br from-muted/40 to-background border-muted/50">
          <CardHeader>
            <CardTitle>KPIs del equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <BigKpi label="Utilización promedio" value={`${kpis.avgUtil}%`} />
              <BigKpi label="En atención" value={kpis.attention} />
              <BigKpi label="Críticos" value={kpis.critical} />
              <BigKpi label="Por vencer ≤ 3d" value={kpis.dueSoon} />
              <BigKpi label="Vencidas" value={kpis.overdue} />
              <BigKpi label="Miembros" value={filtered.length} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href={`/team/${teamId}`}>
              <Button variant="outline">Volver al team</Button>
            </Link>
            {/* futuro: export, cambiar ventana temporal, etc. */}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function BigKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-4 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
