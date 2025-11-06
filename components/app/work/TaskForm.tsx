// components/app/work/TaskForm.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: any | null;
  onSaved: () => Promise<void> | void;
  hoursPerSP: number;
};

export default function TaskForm({
  open,
  onOpenChange,
  initial,
  onSaved,
  hoursPerSP,
}: Props) {
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    type: "FEATURE",
    priority: "MEDIUM",
    status: "PENDING",
    startDate: "",
    dueDate: "",
    estimateSp: 0,
    estimateHours: "",
    progressPct: 0,
    tags: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title ?? "",
        description: initial.description ?? "",
        type: initial.type ?? "FEATURE",
        priority: initial.priority ?? "MEDIUM",
        status: initial.status ?? "PENDING",
        startDate: initial.startDate ? initial.startDate.slice(0, 10) : "",
        dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : "",
        estimateSp: initial.estimateSp ?? 0,
        estimateHours: initial.estimateHours ?? "",
        progressPct: initial.progressPct ?? 0,
        tags: (initial.tags ?? []).join(", "),
      });
    } else {
      setForm((f: any) => ({
        ...f,
        title: "",
        description: "",
        estimateSp: 0,
        estimateHours: "",
      }));
    }
  }, [initial]);

  function update<K extends string>(k: K, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function save() {
    setLoading(true);
    try {
      const payload: any = {
        ...form,
        estimateSp: Number(form.estimateSp || 0),
        progressPct: Number(form.progressPct || 0),
        tags: (form.tags || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      };
      // Si no mandan estimateHours, el backend calcula con hoursPerSP
      if (form.estimateHours !== "")
        payload.estimateHours = Number(form.estimateHours);

      const res = await fetch(
        initial ? `/api/tasks/${initial.id}` : "/api/tasks",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok)
        throw new Error(initial ? "No se pudo actualizar" : "No se pudo crear");
      await onSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => update("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FEATURE">Feature</SelectItem>
                <SelectItem value="BUG">Bug</SelectItem>
                <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                <SelectItem value="SUPPORT">Soporte</SelectItem>
                <SelectItem value="CHORE">Chore</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={form.status}
              onValueChange={(v) => update("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="IN_PROGRESS">En curso</SelectItem>
                <SelectItem value="DONE">Completada</SelectItem>
                <SelectItem value="BLOCKED">Bloqueada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => update("priority", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Baja</SelectItem>
                <SelectItem value="MEDIUM">Media</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="CRITICAL">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Inicio</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fin estimado</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Estimación (SP)</Label>
            <Input
              type="number"
              value={form.estimateSp}
              onChange={(e) => update("estimateSp", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Horas (opcional)</Label>
            <Input
              type="number"
              placeholder={`≈ SP × ${hoursPerSP}`}
              value={form.estimateHours}
              onChange={(e) => update("estimateHours", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Avance (%)</Label>
            <Input
              type="number"
              value={form.progressPct}
              onChange={(e) => update("progressPct", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tags (coma)</Label>
            <Input
              placeholder="frontend, guardia"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={save} disabled={loading}>
            {initial ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
