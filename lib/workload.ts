// src/lib/workload.ts
import prisma from "@/lib/prisma";
import {
  EmploymentType,
  EmploymentStatus,
  Seniority,
  Task,
} from "@/lib/generated/prisma";
import { addDays, endOfISOWeek, startOfISOWeek } from "date-fns";

/** Normaliza el comienzo de semana ISO (lunes 00:00) para reportes/snaps */
export function getISOWeekStart(d: Date | string) {
  return startOfISOWeek(new Date(d));
}
export function getISOWeekEnd(d: Date | string) {
  return endOfISOWeek(new Date(d));
}

/** Defaults por tipo de empleo */
export function defaultCapacityHoursByEmploymentType(
  et?: EmploymentType | null
) {
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

/** Defaults por seniority (SP/semana) */
export function defaultCapacitySpBySeniority(s?: Seniority | null) {
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

/** Heurística de conversión SP→Horas por seniority */
export function defaultHoursPerSPBySeniority(s?: Seniority | null) {
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

/** Capacidad semanal efectiva (horas/SP) resolviendo nulos con defaults */
export function resolveCapacityForUser(u: {
  status: EmploymentStatus;
  employmentType?: EmploymentType | null;
  seniority?: Seniority | null;
  capacityHoursPerWeek?: number | null;
  capacitySpPerWeek?: number | null;
  hoursPerStoryPoint?: number | null;
}) {
  // En licencia: capacidad 0
  if (u.status === "ON_LEAVE") {
    return {
      capHours: 0,
      capSp: 0,
      hPerSp: u.hoursPerStoryPoint ?? defaultHoursPerSPBySeniority(u.seniority),
    };
  }

  const capHours =
    u.capacityHoursPerWeek ??
    defaultCapacityHoursByEmploymentType(u.employmentType);
  const capSp =
    u.capacitySpPerWeek ?? defaultCapacitySpBySeniority(u.seniority);
  const hPerSp =
    u.hoursPerStoryPoint ?? defaultHoursPerSPBySeniority(u.seniority);
  return { capHours, capSp, hPerSp };
}

/** Horas estimadas de una tarea (usa denormalizado o estima con SP) */
export function taskEstimatedHours(
  t: Pick<Task, "estimateHours" | "estimateSp">,
  hPerSp: number
) {
  if (t.estimateHours != null) return t.estimateHours;
  return Math.max(0, (t.estimateSp ?? 0) * hPerSp);
}

/** Proporción de horas de una tarea que caen dentro de [from..to] (ambos inclusive) */
export function proportionalHoursInRange(
  t: { startDate: Date | null; dueDate: Date | null; estimateHours: number },
  from: Date,
  to: Date
) {
  if (!t.startDate && !t.dueDate) {
    // sin fechas => cargamos todo dentro del rango (tratamiento simple)
    return t.estimateHours;
  }
  const start = t.startDate ?? t.dueDate ?? new Date();
  const end = t.dueDate ?? t.startDate ?? start;

  const taskStart = new Date(start);
  const taskEnd = new Date(end);
  if (taskEnd < from || taskStart > to) return 0; // no intersecta

  // duración de la tarea (al menos 1 día)
  const totalDays = Math.max(
    1,
    Math.ceil((taskEnd.getTime() - taskStart.getTime()) / 86400000) + 1
  );
  // intersección con el rango
  const rangeStart = new Date(Math.max(taskStart.getTime(), from.getTime()));
  const rangeEnd = new Date(Math.min(taskEnd.getTime(), to.getTime()));
  const overlapDays = Math.max(
    1,
    Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1
  );

  const proportion = overlapDays / totalDays;
  return Math.round(t.estimateHours * proportion);
}

/** Bucket semanal: devuelve las semanas [weekStart] cubiertas por [from..to] */
export function enumerateWeeks(from: Date, to: Date) {
  const weeks: Date[] = [];
  let cur = getISOWeekStart(from);
  const end = getISOWeekStart(to);
  while (cur <= end) {
    weeks.push(cur);
    cur = addDays(cur, 7);
  }
  return weeks;
}

/** Último score de burnout (0..100) del usuario */
export async function lastBurnoutScore(userId: string) {
  const r = await prisma.surveyResponse.findFirst({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    select: { scoreTotal: true },
  });
  return r ? Number(r.scoreTotal) : null;
}
