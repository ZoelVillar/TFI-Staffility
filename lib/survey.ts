// lib/survey.ts
import encuesta from "@/config/encuesta.json";

export type SurveyJSON = {
  id: string;
  title: string;
  scale: { id: string; options: Array<{ value: number; label: string }> };
  questions: Array<{
    id: string;
    dimension: string;
    text: string;
    scaleId: string;
    weight: number;
    reverse?: boolean;
  }>;
  scoring: {
    normalization: string;
  };
};

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export function getSurvey(): SurveyJSON {
  return encuesta as unknown as SurveyJSON;
}

export function getRiskInfo(score: number) {
  if (score < 25) return { level: "LOW" as RiskLevel, label: "Riesgo Bajo", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  if (score < 50) return { level: "MODERATE" as RiskLevel, label: "Riesgo Moderado", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
  if (score < 75) return { level: "HIGH" as RiskLevel, label: "Riesgo Alto", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
  return { level: "CRITICAL" as RiskLevel, label: "Riesgo Crítico", color: "text-red-600", bg: "bg-red-50 border-red-200" };
}

/** answers: { [questionId]: number (0..4) } */
export function getDimensionLabel(dimId: string): string {
  const dim = (encuesta.dimensions as any[]).find(d => d.id === dimId);
  return dim?.name ?? dimId;
}

export function scoreSurvey(answers: Record<string, number>) {
  const s = getSurvey();
  const items = s.questions;

  let totalWeighted = 0;
  let totalWeights = 0;

  // Acumuladores por dimensión
  // Estructura: { "workload": { points: 12, possible: 16 }, ... }
  const dimAcc: Record<string, { points: number; maxPoints: number }> = {};

  for (const q of items) {
    // Inicializar acumulador si no existe
    if (!dimAcc[q.dimension]) {
      dimAcc[q.dimension] = { points: 0, maxPoints: 0 };
    }

    const raw = answers[q.id];
    if (typeof raw !== "number") continue;

    // Lógica de inversión (0..4)
    const val = q.reverse ? 4 - raw : raw;
    const w = q.weight ?? 1;

    // Total Global
    totalWeighted += val * w;
    totalWeights += w;

    // Total Dimensional
    dimAcc[q.dimension].points += val * w; // Puntos obtenidos ponderados
    dimAcc[q.dimension].maxPoints += 4 * w; // Puntos máximos posibles (4 es el max de la escala)
  }

  // Cálculo Global
  const avg0to4 = totalWeights > 0 ? totalWeighted / totalWeights : 0;
  const score0to100 = Math.round(avg0to4 * 25 * 100) / 100;

  // Cálculo por Dimensión (Normalizado 0-100)
  const dimensions: Record<string, number> = {};
  Object.keys(dimAcc).forEach((key) => {
    const { points, maxPoints } = dimAcc[key];
    const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
    dimensions[key] = Math.round(pct * 100) / 100; // 2 decimales
  });

  return {
    avg0to4,
    score0to100,
    risk: getRiskInfo(score0to100),
    dimensions, // <--- Nuevo Payload
  };
}