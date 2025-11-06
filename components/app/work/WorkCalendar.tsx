// components/app/work/WorkCalendar.tsx
"use client";

import { addDays, format, startOfISOWeek } from "date-fns";
import { es } from "date-fns/locale";

type Task = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  estimateSp: number;
  estimateHours: number | null;
};

export default function WorkCalendar({
  items,
  hoursPerSP, // hoy no lo usamos para layout; lo dejamos por compatibilidad
}: {
  items: Task[];
  hoursPerSP: number;
}) {
  const weekStart = startOfISOWeek(new Date());
  const weekEnd = addDays(weekStart, 6); // 7 días visibles (0..6)
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Normaliza y recorta a la semana visible.
  function clampToWeek(t: Task) {
    // Si no hay fechas, lo mostramos como evento de 1 día (hoy = weekStart)
    const rawStart = t.startDate
      ? new Date(t.startDate)
      : t.dueDate
      ? new Date(t.dueDate)
      : weekStart;
    const rawEnd = t.dueDate
      ? new Date(t.dueDate)
      : t.startDate
      ? new Date(t.startDate)
      : weekStart;

    // Asegurar start <= end
    const s0 = rawStart <= rawEnd ? rawStart : rawEnd;
    const e0 = rawEnd >= rawStart ? rawEnd : rawStart;

    // Recorte a semana
    const s = s0 < weekStart ? weekStart : s0;
    const e = e0 > weekEnd ? weekEnd : e0;

    // Si después del recorte no hay intersección, la ocultamos
    if (e < weekStart || s > weekEnd) return null;

    // Evitar width = 0 cuando s == e → lo tratamos como 1 “unidad” mínima
    return { start: s, end: e };
  }

  // Calcula left/width [%] dentro de la semana
  function barStyleRange(start: Date, end: Date) {
    const min = weekStart.getTime();
    const max = addDays(weekStart, 7).getTime(); // exclusivo
    const s = Math.max(start.getTime(), min);
    const e = Math.min(end.getTime(), max - 1); // evitar 100% exacto para borde
    const total = max - min;
    const left = ((s - min) / total) * 100;
    const width = Math.max(1.5, ((e - s) / total) * 100); // ancho mínimo
    return { left: `${left}%`, width: `${width}%` };
  }

  // -------- Asignación de carriles (lanes) para evitar superposición --------
  type Placed = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    lane: number;
    leftPct: string;
    widthPct: string;
  };

  const placed: Placed[] = (() => {
    // 1) Normalizar y descartar fuera de semana
    const normalized = items
      .map((t) => {
        const r = clampToWeek(t);
        if (!r) return null;
        return { id: t.id, title: t.title, ...r };
      })
      .filter(Boolean) as Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
    }>;

    // 2) Ordenar por inicio (y fin como desempate)
    normalized.sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        a.end.getTime() - b.end.getTime()
    );

    // 3) Greedy: colocar en el primer carril cuyo último fin <= inicio actual
    const lanes: Date[] = []; // guarda el "end" de la última tarea por carril
    const out: Placed[] = [];

    for (const t of normalized) {
      let assignedLane = 0;
      let found = false;
      for (let i = 0; i < lanes.length; i++) {
        // Si no solapa: el último fin en el carril es anterior estrictamente al inicio actual
        if (lanes[i].getTime() < t.start.getTime()) {
          assignedLane = i;
          lanes[i] = t.end; // actualizar fin del carril
          found = true;
          break;
        }
      }
      if (!found) {
        assignedLane = lanes.length;
        lanes.push(t.end);
      }

      const { left, width } = barStyleRange(t.start, t.end);
      out.push({
        id: t.id,
        title: t.title,
        start: t.start,
        end: t.end,
        lane: assignedLane,
        leftPct: left,
        widthPct: width,
      });
    }

    return out;
  })();

  // Altura dinámica según cantidad de carriles
  const rowHeight = 28; // px (h-7 en Tailwind)
  const laneGap = 6; // px
  const lanesCount = placed.reduce((m, p) => Math.max(m, p.lane + 1), 0);
  const containerHeight = Math.max(
    160,
    lanesCount * rowHeight + Math.max(0, lanesCount - 1) * laneGap
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
        {days.map((d, i) => (
          <div key={i} className="text-center">
            {format(d, "EEE d", { locale: es })}
          </div>
        ))}
      </div>

      <div
        className="relative w-full border rounded-lg p-2 bg-muted/30"
        style={{ minHeight: containerHeight }}
      >
        {/* Líneas guía verticales (opcionales) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="grid grid-cols-7 h-full gap-2">
            {days.map((_, i) => (
              <div
                key={i}
                className="border-r last:border-r-0 border-muted/40"
              />
            ))}
          </div>
        </div>

        {/* Barras */}
        {placed.map((p) => (
          <div
            key={p.id}
            className="absolute h-7 rounded-md bg-primary/15 border border-primary/30 overflow-hidden"
            style={{
              left: p.leftPct,
              width: p.widthPct,
              top: p.lane * (rowHeight + laneGap),
            }}
            title={p.title}
          >
            <div className="px-2 truncate text-xs leading-7">{p.title}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: pasá el mouse sobre una barra para ver el título completo.
      </div>
    </div>
  );
}
