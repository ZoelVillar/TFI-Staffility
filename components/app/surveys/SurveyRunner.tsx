"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SurveyJSON = {
  id: string;
  title: string;
  description?: string;
  scale: { id: string; options: Array<{ value: number; label: string }> };
  questions: Array<{
    id: string;
    text: string;
    weight: number;
    reverse?: boolean;
  }>;
};

export default function SurveyRunner({ campaignId }: { campaignId: string }) {
  const [survey, setSurvey] = useState<SurveyJSON | null>(null);
  const [meta, setMeta] = useState<{
    name: string;
    endDate: string;
    status: "ACTIVE" | "CLOSED";
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [already, setAlready] = useState<{
    submittedAt: string;
    scoreTotal: string;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/my-surveys/${campaignId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo cargar la encuesta");
      const data = await res.json();
      setMeta({
        name: data.campaign?.name,
        endDate: data.campaign?.endDate,
        status: data.campaign?.status,
      });
      setSurvey(data.survey);
      setAlready(data.already ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!survey) return;
    // Validación mínima (todas respondidas)
    const missing = survey.questions.filter((q) => answers[q.id] === undefined);
    if (missing.length > 0) {
      alert("Respondé todas las preguntas antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/my-surveys/${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "No se pudo enviar la encuesta");
      }
      await load(); // refresca estado (ya no debe permitir volver a responder)
      alert("¡Gracias! Tu encuesta fue registrada.");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando…</div>;
  }

  if (!survey && already) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Encuesta enviada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ya enviaste esta encuesta (
            {new Date(already.submittedAt).toLocaleString()}). Puntaje
            registrado: <b>{already.scoreTotal}</b>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!survey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Encuesta no disponible</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          La campaña está cerrada o no estás habilitado para responder.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {meta?.name} · Límite:{" "}
            {new Date(meta!.endDate).toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {survey.questions.map((q, idx) => (
            <div key={q.id} className="border rounded-md p-3">
              <div className="mb-2 text-sm">
                <b>{idx + 1}.</b> {q.text}
              </div>
              <div className="flex flex-col gap-1 md:flex-row md:gap-4">
                {[0, 1, 2, 3, 4].map((v) => (
                  <label
                    key={v}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={v}
                      checked={answers[q.id] === v}
                      onChange={() => setAnswers((s) => ({ ...s, [q.id]: v }))}
                    />
                    <span className="text-sm">
                      {/* labels de la escala típicos: Nunca, Raramente, A veces, Frecuentemente, Siempre */}
                      {
                        [
                          "Nunca",
                          "Raramente",
                          "A veces",
                          "Frecuentemente",
                          "Siempre",
                        ][v]
                      }
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
