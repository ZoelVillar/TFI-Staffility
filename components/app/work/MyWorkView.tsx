// components/app/work/MyWorkView.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addDays,
  endOfISOWeek,
  format,
  isBefore,
  startOfISOWeek,
} from "date-fns";
import { es } from "date-fns/locale";
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
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";
import WorkCalendar from "./WorkCalendar";

type InitialUser = {
  id: string;
  name: string | null;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN" | null;
  seniority: "JR" | "SSR" | "SR" | null;
  capacityHoursPerWeek: number | null;
  capacitySpPerWeek: number | null;
  hoursPerStoryPoint: number | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: "FEATURE" | "BUG" | "MAINTENANCE" | "SUPPORT" | "CHORE";
  startDate: string | null;
  dueDate: string | null;
  estimateSp: number;
  estimateHours: number | null;
  progressPct: number;
  tags: string[];
  teamId: string | null;
  createdAt: string;
};

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
function defaultSpBySeniority(s?: string | null) {
  switch (s) {
    case "JR":
      return 12;
    case "SSR":
      return 18;
    case "SR":
      return 22;
    default:
      return 18;
  }
}
function defaultHoursPerSP(s?: string | null) {
  switch (s) {
    case "JR":
      return 6;
    case "SSR":
      return 5;
    case "SR":
      return 4;
    default:
      return 5;
  }
}

export default function MyWorkView({
  initialUser,
}: {
  initialUser: InitialUser;
}) {
  // -------- filtros/estado lista --------
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<
    "ALL" | "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED"
  >("ALL");
  const [priority, setPriority] = useState<
    "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  >("ALL");
  const [type, setType] = useState<
    "ALL" | "FEATURE" | "BUG" | "MAINTENANCE" | "SUPPORT" | "CHORE"
  >("ALL");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [items, setItems] = useState<Task[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isEnd, setIsEnd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [openForm, setOpenForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  // -------- capacidad/heurísticas --------
  const capHours =
    initialUser.capacityHoursPerWeek ??
    defaultHoursByEmploymentType(initialUser.employmentType);
  const spPerWeek =
    initialUser.capacitySpPerWeek ??
    defaultSpBySeniority(initialUser.seniority);
  const hoursPerSP =
    initialUser.hoursPerStoryPoint ?? defaultHoursPerSP(initialUser.seniority);

  // -------- Carga inicial + filtros (debounce) --------
  async function fetchPage(reset = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("take", "20");
      if (!reset && cursor) params.set("cursor", cursor);
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      if (priority !== "ALL") params.set("priority", priority);
      if (type !== "ALL") params.set("type", type);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/tasks?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Error al cargar tareas");
      const data = (await res.json()) as {
        items: Task[];
        nextCursor: string | null;
      };
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
      setIsEnd(!data.nextCursor);
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
      if (reset) {
        setItems([]);
        setCursor(null);
        setIsEnd(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPage(true); /* primera carga */
  }, []);
  useEffect(() => {
    const id = setTimeout(() => startTransition(() => fetchPage(true)), 350);
    return () => clearTimeout(id as any);
  }, [q, status, priority, type, from, to]);

  // -------- KPIs semanales (cliente) --------
  const weekStart = startOfISOWeek(new Date());
  const weekEnd = endOfISOWeek(new Date());

  const plannedHoursThisWeek = useMemo(() => {
    const msDay = 86400000;
    function proportionHours(t: Task) {
      const sh = (t.estimateHours ?? t.estimateSp * hoursPerSP) || 0;
      const start = t.startDate
        ? new Date(t.startDate)
        : t.dueDate
        ? new Date(t.dueDate)
        : null;
      const end = t.dueDate
        ? new Date(t.dueDate)
        : t.startDate
        ? new Date(t.startDate)
        : null;
      if (!start || !end) return sh;
      if (end < weekStart || start > weekEnd) return 0;

      const totalDays = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / msDay) + 1
      );
      const iStart = new Date(Math.max(start.getTime(), weekStart.getTime()));
      const iEnd = new Date(Math.min(end.getTime(), weekEnd.getTime()));
      const overlapDays = Math.max(
        1,
        Math.ceil((iEnd.getTime() - iStart.getTime()) / msDay) + 1
      );
      return Math.round(sh * (overlapDays / totalDays));
    }
    return items.reduce((acc, t) => acc + proportionHours(t), 0);
  }, [items, hoursPerSP, weekStart, weekEnd]);

  const utilization =
    capHours > 0 ? Math.round((plannedHoursThisWeek / capHours) * 100) : 0;
  const riskClass =
    utilization > 100
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : utilization >= 86
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const dueSoon = useMemo(() => {
    const in3d = addDays(new Date(), 3);
    return items.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return (
        isBefore(new Date(), d) &&
        d <= in3d &&
        t.status !== "DONE" &&
        t.status !== "CANCELLED"
      );
    }).length;
  }, [items]);

  const overdue = useMemo(() => {
    return items.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return (
        isBefore(d, new Date()) &&
        t.status !== "DONE" &&
        t.status !== "CANCELLED"
      );
    }).length;
  }, [items]);

  // -------- acciones --------
  function openCreate() {
    setEditTask(null);
    setOpenForm(true);
  }
  function openEdit(t: Task) {
    setEditTask(t);
    setOpenForm(true);
  }
  async function onSaved() {
    setOpenForm(false);
    await fetchPage(true);
  }
  async function loadMore() {
    if (!isEnd && !loading) await fetchPage(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Izquierda: lista + calendario (más ancho) */}
      <div className="lg:col-span-9 space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between py-3">
            <CardTitle className="text-base">Mi trabajo</CardTitle>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <Input
                placeholder="Buscar por título o descripción..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="min-w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Estado: Todos</SelectItem>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="IN_PROGRESS">En curso</SelectItem>
                  <SelectItem value="DONE">Completada</SelectItem>
                  <SelectItem value="BLOCKED">Bloqueada</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priority}
                onValueChange={(v: any) => setPriority(v)}
              >
                <SelectTrigger className="min-w-[120px] h-9 text-xs">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Prioridad: Todas</SelectItem>
                  <SelectItem value="LOW">Baja</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="CRITICAL">Crítica</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="min-w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tipo: Todos</SelectItem>
                  <SelectItem value="FEATURE">Feature</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                  <SelectItem value="SUPPORT">Soporte</SelectItem>
                  <SelectItem value="CHORE">Chore</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 text-xs"
                />
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <Button onClick={openCreate} className="h-9">
                Nueva tarea
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <TaskList
              items={items}
              loading={loading || isPending}
              onLoadMore={loadMore}
              isEnd={isEnd}
              onEdit={openEdit}
              afterChange={() => fetchPage(true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">
              Calendario (semana actual)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <WorkCalendar items={items} hoursPerSP={hoursPerSP} />
          </CardContent>
        </Card>
      </div>

      {/* Derecha: KPIs (más estrechos) */}
      <aside className="lg:col-span-3 space-y-3">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">KPIs personales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-muted-foreground">
                  Capacidad semanal
                </div>
                <div className="text-lg font-semibold">{capHours} h</div>
                <div className="text-[11px] text-muted-foreground">
                  ≈ {spPerWeek} SP • {hoursPerSP} h/SP
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">
                  Planificado (semana)
                </div>
                <div className="text-lg font-semibold">
                  {plannedHoursThisWeek} h
                </div>
              </div>
            </div>

            <div className={`border rounded-lg px-2 py-1 text-xs ${riskClass}`}>
              Utilización: <span className="font-semibold">{utilization}%</span>{" "}
              <span className="text-[10px]">
                ({format(weekStart, "d MMM", { locale: es })} –{" "}
                {format(weekEnd, "d MMM", { locale: es })})
              </span>
            </div>

            <div className="flex gap-1">
              <Badge
                variant="outline"
                className="h-6 px-2 text-[11px] border-amber-200 text-amber-700"
              >
                Pronto a vencer: {dueSoon}
              </Badge>
              <Badge
                variant="outline"
                className="h-6 px-2 text-[11px] border-rose-200 text-rose-700"
              >
                Vencidas: {overdue}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Consejo</CardTitle>
          </CardHeader>
          <CardContent className="text-[12px] text-muted-foreground p-3">
            Mantené estimaciones en <span className="font-medium">SP</span> y
            fechas realistas. Si tu utilización supera 100%, priorizá y dividí
            tareas largas.
          </CardContent>
        </Card>
      </aside>

      {/* Modal crear/editar */}
      <TaskForm
        open={openForm}
        onOpenChange={setOpenForm}
        initial={editTask}
        onSaved={onSaved}
        hoursPerSP={hoursPerSP}
      />
    </div>
  );
}
