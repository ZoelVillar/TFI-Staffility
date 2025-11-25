// components/app/work/WorkCalendar.tsx
"use client";

import { addDays, format, startOfISOWeek, isSameDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

type Task = {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
};

export default function WorkCalendar({ items }: { items: Task[]; hoursPerSP: number }) {
  const weekStart = startOfISOWeek(new Date());
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const today = new Date();

  // Filtramos tareas que ocurran en esta semana
  const visibleTasks = items.filter(t => {
    if (!t.startDate && !t.dueDate) return false;
    const start = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!);
    const end = t.dueDate ? new Date(t.dueDate) : start;

    // Chequeo de superposición simple
    const weekEnd = addDays(weekStart, 6);
    return start <= weekEnd && end >= weekStart && t.status !== 'DONE' && t.status !== 'CANCELLED';
  });

  return (
    <div className="border rounded-lg bg-white select-none">
      {/* Header de Días */}
      <div className="grid grid-cols-7 border-b bg-muted/20 text-center">
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} className={`py-2 text-xs border-r last:border-r-0 ${isToday ? 'bg-primary/5 font-bold text-primary' : 'text-muted-foreground'}`}>
              <div>{format(d, "EEE", { locale: es })}</div>
              <div className="text-lg">{format(d, "d")}</div>
            </div>
          );
        })}
      </div>

      {/* Cuerpo del Calendario (Simple List View per Day por ahora para evitar complejidad de layout absoluto) */}
      <div className="grid grid-cols-7 min-h-[150px]">
        {days.map((day, i) => {
          const dayTasks = visibleTasks.filter(t => {
            const start = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!);
            const end = t.dueDate ? new Date(t.dueDate) : start;
            // Normalizar horas para comparar solo fechas
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            const current = new Date(day);
            current.setHours(0, 0, 0, 0);

            return isWithinInterval(current, { start, end });
          });

          return (
            <div key={i} className="border-r last:border-r-0 p-1 space-y-1 relative">
              {/* Fines de semana sombreados */}
              {(i === 5 || i === 6) && <div className="absolute inset-0 bg-muted/10 pointer-events-none" />}

              {dayTasks.map(t => (
                <div key={t.id} className={`text-[10px] p-1.5 rounded border truncate mb-1 shadow-sm ${t.status === 'BLOCKED' ? 'bg-red-50 border-red-200 text-red-700' :
                  t.status === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                    'bg-white border-slate-200 text-slate-700'
                  }`} title={t.title}>
                  {t.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}