// src/lib/survey.ts
import encuesta from "@/config/encuesta.json";

/** Tipos mínimos según tu JSON */
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
    normalization: string; // "score_0_100 = promedio * 25"
  };
};

export function getSurvey(): SurveyJSON {
  return encuesta as unknown as SurveyJSON;
}

/** answers: { [questionId]: number (0..4) } */
export function scoreSurvey(answers: Record<string, number>) {
  const s = getSurvey();
  const items = s.questions;

  let totalWeighted = 0;
  let totalWeights = 0;

  for (const q of items) {
    const raw = answers[q.id];
    if (typeof raw !== "number") continue;

    const v = q.reverse ? 4 - raw : raw; // escala 0..4
    totalWeighted += v * (q.weight ?? 1);
    totalWeights += q.weight ?? 1;
  }

  const avg0to4 = totalWeights > 0 ? totalWeighted / totalWeights : 0;
  // Normalización simple definida en tu JSON: 0..4 -> 0..100
  const score0to100 = Math.round(avg0to4 * 25 * 100) / 100; // 2 decimales

  return {
    avg0to4,
    score0to100,
  };
}
