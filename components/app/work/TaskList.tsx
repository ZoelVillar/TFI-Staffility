// components/app/work/TaskList.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
  commentCount?: number; // <--- Nuevo campo
  tags: string[];
  teamId: string | null;
  createdAt: string;
};

export default function TaskList({
  items, loading, isEnd, onLoadMore, onEdit, afterChange,
}: {
  items: Task[];
  loading: boolean;
  isEnd: boolean;
  onLoadMore: () => Promise<void>;
  onEdit: (t: Task) => void;
  afterChange: () => Promise<void> | void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);

  async function quickStatusUpdate(id: string, newStatus: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Error actualizando");
      await afterChange();
    } catch (e) {
      alert("No se pudo actualizar el estado");
    } finally {
      setUpdating(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar tarea?")) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) alert("No se pudo eliminar");
    await afterChange();
  }

  const statusColors: Record<string, string> = {
    PENDING: "text-slate-500",
    IN_PROGRESS: "text-blue-600 font-medium",
    DONE: "text-emerald-600",
    BLOCKED: "text-red-600",
    CANCELLED: "text-gray-400 line-through"
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-muted/30 border-b text-xs uppercase text-muted-foreground">
              <th className="py-3 px-4 w-[35%]">Tarea</th>
              <th className="w-[10%]">Prioridad</th>
              <th className="w-[15%]">Estado</th>
              <th className="hidden sm:table-cell">Estimación</th>
              <th className="hidden sm:table-cell text-right pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                <td className="py-3 px-4 align-top">
                  <div className="flex flex-col gap-1 cursor-pointer" onClick={() => onEdit(t)}>
                    <span className={`font-medium ${t.status === 'DONE' ? 'text-muted-foreground line-through' : ''}`}>
                      {t.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{t.type}</Badge>
                      {t.commentCount ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" /> {t.commentCount}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>

                <td className="align-top py-3">
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${t.priority === 'CRITICAL' ? 'border-red-200 text-red-700 bg-red-50' :
                    t.priority === 'HIGH' ? 'border-orange-200 text-orange-700 bg-orange-50' : ''
                    }`}>
                    {t.priority}
                  </Badge>
                </td>

                <td className="align-top py-2">
                  {/* Quick Action: Status Select */}
                  <Select
                    value={t.status}
                    onValueChange={(v) => quickStatusUpdate(t.id, v)}
                    disabled={updating === t.id}
                  >
                    <SelectTrigger className={`h-8 text-xs border-transparent hover:border-input focus:ring-0 w-[130px] ${statusColors[t.status] || ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="IN_PROGRESS">En curso</SelectItem>
                      <SelectItem value="BLOCKED">Bloqueada</SelectItem>
                      <SelectItem value="DONE">Completada</SelectItem>
                      <SelectItem value="CANCELLED">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                <td className="hidden sm:table-cell align-top py-3 text-xs text-muted-foreground">
                  <div>{t.estimateSp > 0 ? `${t.estimateSp} SP` : '-'}</div>
                  <div>{t.estimateHours ? `${t.estimateHours} h` : '-'}</div>
                </td>

                <td className="hidden sm:table-cell align-top py-3 text-right pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(t)}>Ver detalles</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => remove(t.id)}>Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No tienes tareas asignadas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center py-2">
        <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loading || isEnd}>
          {isEnd ? "Fin de la lista" : loading ? "Cargando..." : "Ver más antiguas"}
        </Button>
      </div>
    </div>
  );
}