"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  statusCampaign: "ACTIVE" | "CLOSED";
  myStatus: "PENDING" | "COMPLETED" | "EXPIRED";
  createdAt: string;
};

function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export default function MySurveysView() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<Item | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/my-surveys", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          if (mounted) alert("No se pudo cargar tus encuestas");
          return;
        }
        const data = await res.json();
        const rows = (data.items as Item[]) ?? [];
        if (!mounted) return;
        setItems(rows);

        // Encuesta activa pendiente (la más reciente)
        const cand = rows.find(
          (r) => r.statusCampaign === "ACTIVE" && r.myStatus === "PENDING"
        );
        if (!mounted) return;
        setActive(cand ?? null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error(err);
        if (mounted) alert("No se pudo cargar tus encuestas");
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const history = useMemo(() => {
    return items.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }, [items]);

  return (
    <div className="space-y-6">
      {/* ENCUESTA ACTIVA */}
      <Card>
        <CardHeader>
          <CardTitle>Encuesta activa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            {active ? (
              <>
                <div>
                  Campaña: <b>{active.name}</b> · Límite:{" "}
                  <b>{fmtDate(active.endDate)}</b> · Tiempo estimado:{" "}
                  <b>8–10 min</b>
                </div>
                <div className="text-muted-foreground">
                  Tus respuestas son internas. Los líderes ven resultados sólo
                  en forma agregada.
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                No tenés encuestas pendientes.
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={active ? `/surveys/my/${active.id}` : "#"}
              aria-disabled={!active}
            >
              <Button disabled={!active}>Completar encuesta</Button>
            </Link>
            <Button variant="secondary" disabled>
              Recordar más tarde
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HISTORIAL */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de mis encuestas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-muted/30">
                  <th className="py-3 pl-4">Campaña</th>
                  <th>Fecha de envío</th>
                  <th>Estado</th>
                  <th className="pr-4 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-3 pl-4">{h.name}</td>
                    <td>{fmtDate(h.startDate)}</td>
                    <td>
                      {h.myStatus === "COMPLETED" ? (
                        <span className="text-xs px-2 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
                          Completada
                        </span>
                      ) : h.myStatus === "EXPIRED" ? (
                        <span className="text-xs px-2 py-1 rounded-full border bg-rose-50 border-rose-200 text-rose-700">
                          Vencida
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="pr-4 text-right">
                      {h.myStatus === "COMPLETED" ? (
                        <Button size="sm" variant="secondary" disabled>
                          Ver comprobante
                        </Button>
                      ) : h.myStatus === "PENDING" ? (
                        <Link href={`/surveys/my/${h.id}`}>
                          <Button size="sm">Completar ahora</Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="secondary" disabled>
                          Motivo
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No hay encuestas para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
