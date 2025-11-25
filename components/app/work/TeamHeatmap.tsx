// components/app/work/TeamHeatmap.tsx
"use client";

import { useMemo } from "react";
import {
  addDays, format, isSameDay, isWeekend
} from "date-fns";
import { es } from "date-fns/locale";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Member = {
  id: string;
  name: string | null;
  image: string | null;
  capacityHoursPerWeek: number | null;
};

type Task = {
  id: string;
  ownerId: string;
  estimateHours: number | null;
  estimateSp: number;
  startDate: string | null;
  dueDate: string | null;
  status: string;
};

type Props = {
  members: Member[];
  tasks: Task[];
  weekStart: Date;
  hoursPerSP: number;
};

export default function TeamHeatmap({ members, tasks, weekStart, hoursPerSP }: Props) {
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Matriz de cálculo [userId][dayIndex] = hoursPlanned
  const matrix = useMemo(() => {
    const map = new Map<string, number[]>();

    // Inicializar filas por miembro
    members.forEach(m => map.set(m.id, [0, 0, 0, 0, 0, 0, 0]));

    tasks.forEach(t => {
      if (!map.has(t.ownerId)) return; // Tarea de alguien que no está en la lista (o ex-miembro)
      if (t.status === 'DONE' || t.status === 'CANCELLED') return;

      // Fechas seguras
      const start = t.startDate ? new Date(t.startDate) : (t.dueDate ? new Date(t.dueDate) : new Date());
      const end = t.dueDate ? new Date(t.dueDate) : start;

      // Determinar horas totales
      const totalHours = t.estimateHours ?? (t.estimateSp * hoursPerSP);
      if (!totalHours || totalHours <= 0) return;

      // Calcular intersección con la semana visualizada
      days.forEach((day, i) => {
        // Normalizar a medianoche para comparar fechas
        const currentDay = new Date(day); currentDay.setHours(0, 0, 0, 0);
        const taskStart = new Date(start); taskStart.setHours(0, 0, 0, 0);
        const taskEnd = new Date(end); taskEnd.setHours(0, 0, 0, 0);

        if (currentDay >= taskStart && currentDay <= taskEnd) {
          // Algoritmo simple de distribución: Horas Totales / Días de Duración
          // Esto asume carga uniforme.
          const durationMs = Math.abs(taskEnd.getTime() - taskStart.getTime());
          const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1;

          const dailyLoad = totalHours / durationDays;

          const userRow = map.get(t.ownerId)!;
          userRow[i] += dailyLoad;
        }
      });
    });

    return map;
  }, [members, tasks, days, hoursPerSP]);

  // Función de color
  function getCellColor(hours: number, weeklyCap: number) {
    const dailyCap = weeklyCap ? weeklyCap / 5 : 8; // Estimado diario
    if (hours <= 0.1) return "bg-slate-50"; // Vacío

    const ratio = hours / dailyCap; // 1.0 = 100%

    if (ratio < 0.5) return "bg-emerald-100/80"; // Ligero
    if (ratio <= 0.9) return "bg-emerald-300";   // Óptimo (verde sólido)
    if (ratio <= 1.1) return "bg-amber-300";     // Al límite (amarillo)
    if (ratio < 1.5) return "bg-orange-400 text-white"; // Sobrecarga (naranja)
    return "bg-rose-600 text-white font-bold";   // Crítico (rojo)
  }

  return (
    <div className="border rounded-md overflow-hidden text-sm bg-white">
      {/* Header: Días */}
      <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b bg-muted/30">
        <div className="p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider flex items-center">
          Miembros
        </div>
        {days.map((d, i) => (
          <div key={i} className={`p-2 text-center border-l text-xs flex flex-col justify-center ${isSameDay(d, new Date()) ? 'bg-primary/5 text-primary font-bold' : 'text-muted-foreground'}`}>
            <span>{format(d, "EEE", { locale: es })}</span>
            <span className="text-lg">{format(d, "d")}</span>
          </div>
        ))}
      </div>

      {/* Body: Filas por Usuario */}
      <div>
        {members.map(m => {
          const rowData = matrix.get(m.id) ?? [0, 0, 0, 0, 0, 0, 0];
          return (
            <div key={m.id} className="grid grid-cols-[180px_repeat(7,1fr)] border-b last:border-0 group hover:bg-slate-50 transition-colors">
              {/* Info Usuario */}
              <div className="p-3 flex items-center gap-3 border-r bg-white z-10">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src={m.image ?? ""} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {m.name?.substring(0, 2).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <div className="truncate font-medium text-xs" title={m.name ?? ""}>{m.name}</div>
                  <div className="text-[10px] text-muted-foreground">{m.capacityHoursPerWeek ?? 40}h/sem</div>
                </div>
              </div>

              {/* Celdas */}
              {days.map((d, i) => {
                const hours = rowData[i];
                const colorClass = getCellColor(hours, m.capacityHoursPerWeek ?? 40);
                const isWknd = isWeekend(d);

                return (
                  <TooltipProvider key={i}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className={`border-l h-14 flex items-center justify-center text-xs cursor-default transition-all hover:brightness-95 ${isWknd ? 'opacity-60 grayscale-[0.5]' : ''} ${colorClass}`}>
                          {hours > 0.1 && <span>{Math.round(hours)}h</span>}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-bold">{format(d, "EEEE d", { locale: es })}</p>
                          <p>Carga Estimada: {hours.toFixed(1)} hs</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}