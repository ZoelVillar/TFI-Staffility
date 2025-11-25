// components/app/surveys/SurveyRunner.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { getRiskInfo } from "@/lib/survey";

// Tipos actualizados
type SurveyState = "LOADING" | "PENDING" | "COMPLETED" | "EXPIRED" | "ERROR";

export default function SurveyRunner({ campaignId }: { campaignId: string }) {
  const [status, setStatus] = useState<SurveyState>("LOADING");
  const [survey, setSurvey] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [already, setAlready] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setStatus("LOADING");
    try {
      const res = await fetch(`/api/my-surveys/${campaignId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Error cargando encuesta");

      const data = await res.json();
      setMeta(data.meta);
      setAlready(data.already);
      setSurvey(data.survey);

      // Usamos el estado explícito del servidor
      setStatus(data.myStatus || "ERROR");

    } catch (e) {
      console.error(e);
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!survey) return;
    // Validar todas respondidas
    const totalQuestions = survey.questions.length;
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < totalQuestions) {
      alert(`Faltan responder ${totalQuestions - answeredCount} preguntas.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/my-surveys/${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Error al enviar");

      // Recargar para mostrar estado completado
      await load();
    } catch (e) {
      alert("Hubo un error al enviar tus respuestas.");
      setSubmitting(false);
    }
  }

  // --- Renderizado Condicional ---

  if (status === "LOADING") {
    return <div className="p-8 text-center text-muted-foreground">Cargando encuesta...</div>;
  }

  if (status === "ERROR") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>No se pudo cargar la encuesta o no tienes acceso.</AlertDescription>
        <div className="mt-2">
          <Link href="/surveys/my"><Button variant="outline" size="sm">Volver</Button></Link>
        </div>
      </Alert>
    );
  }

  if (status === "COMPLETED") {
    const score = Number(already?.scoreTotal ?? 0);
    const risk = getRiskInfo(score);

    return (
      <Card className={`border-2 ${risk.bg}`}>
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto p-3 rounded-full w-fit mb-2 bg-white border`}>
            <CheckCircle2 className={`h-8 w-8 ${risk.color}`} />
          </div>
          <CardTitle className={risk.color}>Encuesta Registrada</CardTitle>
          <CardDescription>
            Gracias por tu feedback. Tus respuestas ayudan a mejorar el bienestar del equipo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">

          <div className="grid gap-2 justify-center">
            <span className="text-sm text-muted-foreground uppercase tracking-widest">Nivel de Riesgo Detectado</span>
            <div className="flex items-baseline justify-center gap-2">
              <span className={`text-5xl font-extrabold ${risk.color}`}>{score.toFixed(0)}</span>
              <span className="text-muted-foreground font-medium">/ 100</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold bg-white border shadow-sm ${risk.color}`}>
              {risk.label}
            </span>
          </div>

          <div className="text-sm text-muted-foreground max-w-md mx-auto bg-white/50 p-4 rounded-lg">
            <p>
              Nota: Un puntaje bajo (0-25) indica un estado óptimo de bienestar.
              Un puntaje alto indica riesgo de agotamiento (Burnout).
            </p>
          </div>

          <Link href="/surveys/my">
            <Button className="w-full sm:w-auto" variant="outline">Volver a mis encuestas</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  if (status === "EXPIRED") {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-700">
            <Clock className="h-5 w-5" />
            <CardTitle>Encuesta Vencida</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-amber-800 mb-4">
            Esta campaña finalizó el {new Date(meta?.endDate).toLocaleDateString()} y ya no acepta respuestas.
          </p>
          <Link href="/surveys/my">
            <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">Volver</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Estado PENDING -> Renderizar formulario
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{meta?.name}</h1>
          <p className="text-sm text-muted-foreground">Cierra el {new Date(meta?.endDate).toLocaleDateString()}</p>
        </div>
        <Link href="/surveys/my">
          <Button variant="ghost" size="sm">Cancelar</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6 space-y-8">
          {survey?.questions.map((q: any, idx: number) => (
            <div key={q.id} className="space-y-3">
              <div className="font-medium text-base">
                <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                {q.text}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    className={`
                      px-2 py-3 rounded-md text-sm border transition-all
                      ${answers[q.id] === val
                        ? "bg-primary text-primary-foreground border-primary ring-2 ring-offset-1 ring-primary/30 font-medium"
                        : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"}
                    `}
                  >
                    {["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"][val]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 pb-10">
        <Button size="lg" onClick={submit} disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar Encuesta"}
        </Button>
      </div>
    </div>
  );
}