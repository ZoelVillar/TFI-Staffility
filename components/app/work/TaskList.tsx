// components/app/work/TaskList.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: "FEATURE" | "BUG" | "MAINTENANCE" | "SUPPORT" | "CHORE";
  startDate: string | null;
  dueDate: string | null;
  estimateSp: number;
  estimateHours: number | null;
  progressPct: number;
  tags: string[];
  teamId: string | null;
  createdAt: string;
};

export default function TaskList({
  items,
  loading,
  isEnd,
  onLoadMore,
  onEdit,
  afterChange,
}: {
  items: Task[];
  loading: boolean;
  isEnd: boolean;
  onLoadMore: () => Promise<void>;
  onEdit: (t: Task) => void;
  afterChange: () => Promise<void> | void;
}) {
  async function quickUpdate(id: string, patch: any) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) alert("No se pudo actualizar");
    await afterChange();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar tarea?")) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) alert("No se pudo eliminar");
    await afterChange();
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-muted/30 border-b">
              <th className="py-2 px-3">Título</th>
              <th>Tipo</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>SP</th>
              <th>Horas</th>
              <th>Avance</th>
              <th className="pr-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr
                key={t.id}
                className="border-b last:border-0 hover:bg-muted/20"
              >
                <td className="py-2 px-3">
                  <div className="font-medium">{t.title}</div>
                  {t.description && (
                    <div className="text-muted-foreground text-xs line-clamp-1">
                      {t.description}
                    </div>
                  )}
                </td>
                <td>{t.type}</td>
                <td>
                  <Badge
                    variant="outline"
                    className={
                      t.priority === "CRITICAL"
                        ? "border-rose-300 text-rose-700"
                        : t.priority === "HIGH"
                        ? "border-amber-300 text-amber-700"
                        : t.priority === "MEDIUM"
                        ? ""
                        : "border-emerald-300 text-emerald-700"
                    }
                  >
                    {t.priority}
                  </Badge>
                </td>
                <td>{t.status}</td>
                <td>{t.startDate?.slice(0, 10) ?? "—"}</td>
                <td>{t.dueDate?.slice(0, 10) ?? "—"}</td>
                <td>{t.estimateSp}</td>
                <td>{t.estimateHours ?? "—"}</td>
                <td>{t.progressPct}%</td>
                <td className="pr-3">
                  <div className="flex justify-end gap-2">
                    {t.status !== "DONE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          quickUpdate(t.id, {
                            status: "DONE",
                            progressPct: 100,
                          })
                        }
                      >
                        Marcar done
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onEdit(t)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => remove(t.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={10}
                  className="py-6 text-center text-muted-foreground"
                >
                  Sin tareas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={loading || isEnd}
        >
          {isEnd ? "No hay más" : loading ? "Cargando..." : "Cargar más"}
        </Button>
      </div>
    </div>
  );
}
