// lib/workload.ts
import prisma from "@/lib/prisma";
import {
  EmploymentType,
  EmploymentStatus,
  Seniority,
  Task,
} from "@/lib/generated/prisma";
import { 
  addDays, 
  endOfISOWeek, 
  startOfISOWeek, 
  isWeekend, 
  isSameDay, 
  isBefore, 
  isAfter 
} from "date-fns";

// --- CONFIGURACIÓN CENTRALIZADA (Source of Truth) ---
// Exportamos esto para que la UI también lo use en validaciones/defaults
export const WORKLOAD_CONFIG = {
  HOURS: {
    FULL_TIME: 40,
    PART_TIME: 20,
    CONTRACTOR: 30,
    INTERN: 15,
    DEFAULT: 40
  },
  SP_VELOCITY: {
    JR: 12,
    SSR: 18,
    SR: 22,
    DEFAULT: 18
  },
  HOURS_PER_SP: {
    JR: 6, // Menor seniority = más horas por punto
    SSR: 5,
    SR: 4,
    DEFAULT: 5
  }
} as const;

// --- HELPERS DE FECHA ---

/** Normaliza el comienzo de semana ISO (Lunes 00:00) */
export function getISOWeekStart(d: Date | string) {
  return startOfISOWeek(new Date(d));
}

export function getISOWeekEnd(d: Date | string) {
  return endOfISOWeek(new Date(d));
}

/**
 * Calcula la cantidad de días hábiles (Lunes-Viernes) en un rango inclusivo.
 */
function getBusinessDaysCount(start: Date, end: Date): number {
  if (isAfter(start, end)) return 0;
  
  let count = 0;
  let current = new Date(start);

  // Optimización: Si el rango es muy grande, se podría usar matemática,
  // pero para tareas (días/semanas) la iteración es segura y precisa.
  while (isBefore(current, end) || isSameDay(current, end)) {
    if (!isWeekend(current)) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

/** * Calcula la cantidad total de días (naturales) en un rango inclusivo. 
 * Fallback para tareas de fin de semana.
 */
function getTotalDaysCount(start: Date, end: Date): number {
  if (isAfter(start, end)) return 0;
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDayMs)) + 1;
}

// --- MOTORES DE CAPACIDAD ---

export function defaultCapacityHoursByEmploymentType(et?: EmploymentType | null) {
  if (!et) return WORKLOAD_CONFIG.HOURS.DEFAULT;
  return WORKLOAD_CONFIG.HOURS[et] ?? WORKLOAD_CONFIG.HOURS.DEFAULT;
}

export function defaultCapacitySpBySeniority(s?: Seniority | null) {
  if (!s) return WORKLOAD_CONFIG.SP_VELOCITY.DEFAULT;
  return WORKLOAD_CONFIG.SP_VELOCITY[s] ?? WORKLOAD_CONFIG.SP_VELOCITY.DEFAULT;
}

export function defaultHoursPerSPBySeniority(s?: Seniority | null) {
  if (!s) return WORKLOAD_CONFIG.HOURS_PER_SP.DEFAULT;
  return WORKLOAD_CONFIG.HOURS_PER_SP[s] ?? WORKLOAD_CONFIG.HOURS_PER_SP.DEFAULT;
}

/** * Resuelve la capacidad "Física" (Horas) y "Velocidad" (SP) del usuario.
 * Prioridad: Valor en DB > Default por Tipo/Seniority > Default Global
 */
export function resolveCapacityForUser(u: {
  status: EmploymentStatus;
  employmentType?: EmploymentType | null;
  seniority?: Seniority | null;
  capacityHoursPerWeek?: number | null;
  capacitySpPerWeek?: number | null;
  hoursPerStoryPoint?: number | null;
}) {
  // Regla de negocio: En licencia = Capacidad 0
  if (u.status === "ON_LEAVE") {
    return {
      capHours: 0,
      capSp: 0,
      hPerSp: u.hoursPerStoryPoint ?? defaultHoursPerSPBySeniority(u.seniority),
    };
  }

  const capHours = u.capacityHoursPerWeek ?? defaultCapacityHoursByEmploymentType(u.employmentType);
  const capSp = u.capacitySpPerWeek ?? defaultCapacitySpBySeniority(u.seniority);
  const hPerSp = u.hoursPerStoryPoint ?? defaultHoursPerSPBySeniority(u.seniority);

  return { capHours, capSp, hPerSp };
}

// --- MOTORES DE CÁLCULO DE CARGA (El cambio crítico) ---

/**
 * Calcula cuántas horas de una tarea caen dentro de una ventana de tiempo (ej: esta semana).
 * Utiliza algoritmo de Días Hábiles:
 * - Si una tarea es de Viernes a Lunes (10hs):
 * - Viernes: 5hs
 * - Sábado: 0hs
 * - Domingo: 0hs
 * - Lunes: 5hs
 */
export function proportionalHoursInRange(
  t: { startDate: Date | null; dueDate: Date | null; estimateHours: number },
  windowStart: Date,
  windowEnd: Date
) {
  // 1. Normalización de Fechas
  // Si no tiene fechas, asumimos que es "Backlog sin fecha" y NO imputamos carga 
  // O asumimos que es "Para hacer YA" e imputamos todo. 
  // Regla de Negocio actual: Si no hay fechas, imputamos todo en la ventana actual para alertar.
  if (!t.startDate && !t.dueDate) {
    return t.estimateHours; 
  }

  const taskStart = t.startDate ? new Date(t.startDate) : (t.dueDate ? new Date(t.dueDate) : new Date());
  const taskEnd = t.dueDate ? new Date(t.dueDate) : taskStart;

  // Validación de consistencia
  const start = isBefore(taskStart, taskEnd) ? taskStart : taskEnd;
  const end = isAfter(taskEnd, taskStart) ? taskEnd : taskStart;

  // 2. Chequeo de Intersección Básica
  // Si la tarea termina antes de que empiece la ventana O empieza después de que termine
  if (isBefore(end, windowStart) || isAfter(start, windowEnd)) {
    return 0;
  }

  // 3. Cálculo de Esfuerzo Diario (Burn Rate)
  let totalDurationDays = getBusinessDaysCount(start, end);
  let isWeekendTask = false;

  // Fallback: Si la tarea es SOLO fin de semana (ej: Guardia Sáb-Dom), totalBusinessDays es 0.
  // En ese caso, usamos días naturales para no romper la división.
  if (totalDurationDays === 0) {
    totalDurationDays = getTotalDaysCount(start, end);
    isWeekendTask = true;
  }

  // Evitar división por cero (si start == end y es feriado/fin de semana raro)
  if (totalDurationDays === 0) totalDurationDays = 1;

  const hoursPerDay = t.estimateHours / totalDurationDays;

  // 4. Cálculo de Intersección (Overlap)
  // La ventana efectiva es el recorte entre la Tarea y la Ventana solicitada
  const overlapStart = isAfter(start, windowStart) ? start : windowStart;
  const overlapEnd = isBefore(end, windowEnd) ? end : windowEnd;

  let overlapDays = 0;
  if (isWeekendTask) {
    overlapDays = getTotalDaysCount(overlapStart, overlapEnd);
  } else {
    overlapDays = getBusinessDaysCount(overlapStart, overlapEnd);
  }

  // 5. Resultado Final
  const result = hoursPerDay * overlapDays;
  
  // Retornamos redondeado a 2 decimales para precisión, la UI redondeará a entero
  return Math.round(result * 100) / 100;
}

/** * Estima las horas de una tarea. 
 * Fuente de la verdad: Horas explícitas > SP * Conversión > 0 
 */
export function taskEstimatedHours(
  t: Pick<Task, "estimateHours" | "estimateSp">,
  hPerSp: number
) {
  if (t.estimateHours !== null && t.estimateHours !== undefined) {
    return t.estimateHours;
  }
  return Math.max(0, (t.estimateSp ?? 0) * hPerSp);
}

export async function lastBurnoutScore(userId: string) {
  const r = await prisma.surveyResponse.findFirst({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    select: { scoreTotal: true },
  });
  return r ? Number(r.scoreTotal) : null;
}