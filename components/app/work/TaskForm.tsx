// components/app/work/TaskForm.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskComments from "./TaskComments";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: any | null;
  onSaved: () => Promise<void> | void;
  hoursPerSP: number;
};

export default function TaskForm({
  open, onOpenChange, initial, onSaved, hoursPerSP,
}: Props) {
  // Mantenemos el estado para controlar el reset al abrir
  const [activeTab, setActiveTab] = useState("details");

  const [form, setForm] = useState<any>({
    title: "", description: "", type: "FEATURE", priority: "MEDIUM",
    status: "PENDING", startDate: "", dueDate: "",
    estimateSp: 0, estimateHours: "", progressPct: 0, tags: "",
  });
  const [loading, setLoading] = useState(false);

  // Resetear tab al abrir el modal
  useEffect(() => {
    if (open) setActiveTab("details");
  }, [open]);

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
      setForm({
        title: "", description: "", type: "FEATURE", priority: "MEDIUM", status: "PENDING",
        startDate: new Date().toISOString().slice(0, 10), // Default hoy
        dueDate: "", estimateSp: 0, estimateHours: "", progressPct: 0, tags: "",
      });
    }
  }, [initial]);

  // Autocalcular horas sugeridas al cambiar SP (UX improvement)
  useEffect(() => {
    if (!initial && form.estimateSp > 0 && !form.estimateHours) {
      setForm((f: any) => ({ ...f, estimateHours: f.estimateSp * hoursPerSP }));
    }
  }, [form.estimateSp, hoursPerSP, initial]);

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
        tags: (form.tags || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      };
      if (form.estimateHours !== "") payload.estimateHours = Number(form.estimateHours);

      const res = await fetch(initial ? `/api/tasks/${initial.id}` : "/api/tasks", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      await onSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] sm:h-auto flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{initial ? "Detalle de Tarea" : "Nueva Tarea"}</DialogTitle>
        </DialogHeader>

        {/* Utilizamos el componente Tabs de UI */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Solo mostramos la lista de pestañas si es edición (initial existe) */}
          {initial && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="comments">Comentarios</TabsTrigger>
            </TabsList>
          )}

          {/* Contenido: Detalles */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-1 pb-2 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 flex-1">
              {/* Columna Izquierda: Esenciales */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => update("title", e.target.value)} autoFocus />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => update("type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FEATURE">Feature</SelectItem>
                        <SelectItem value="BUG">Bug</SelectItem>
                        <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                        <SelectItem value="SUPPORT">Soporte</SelectItem>
                        <SelectItem value="CHORE">Chore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Baja</SelectItem>
                        <SelectItem value="MEDIUM">Media</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="CRITICAL">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="IN_PROGRESS">En curso</SelectItem>
                      <SelectItem value="DONE">Completada</SelectItem>
                      <SelectItem value="BLOCKED">Bloqueada</SelectItem>
                      <SelectItem value="CANCELLED">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Columna Derecha: Planificación */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Inicio</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimiento</Label>
                    <Input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Puntos (SP)</Label>
                    <Input type="number" value={form.estimateSp} onChange={(e) => update("estimateSp", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Horas Estimadas</Label>
                    <Input type="number" value={form.estimateHours} onChange={(e) => update("estimateHours", e.target.value)} placeholder={`~ ${form.estimateSp * hoursPerSP}`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input placeholder="frontend, urgente..." value={form.tags} onChange={(e) => update("tags", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descripción</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Detalles técnicos, criterios de aceptación..." />
              </div>
            </div>

            {/* Footer de botones dentro del contenido de Detalles */}
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t sticky bottom-0 bg-background">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={save} disabled={loading}>{initial ? "Guardar Cambios" : "Crear Tarea"}</Button>
            </div>
          </TabsContent>

          {/* Contenido: Comentarios */}
          <TabsContent value="comments" className="flex-1 overflow-hidden flex flex-col h-full">
            <div className="flex-1 min-h-[300px] overflow-hidden">
              {initial && <TaskComments taskId={initial.id} />}
            </div>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}