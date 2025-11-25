// components/app/team/CreateTeamForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateTeamForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<{ id: string; name: string | null }[]>([]);

  // Estado del formulario
  const [form, setForm] = useState({
    name: "",
    description: "",
    leadId: "none",
  });

  // Cargar posibles líderes al montar
  useEffect(() => {
    async function fetchResources() {
      try {
        const res = await fetch("/api/company/resources");
        if (res.ok) {
          const data = await res.json();
          // Usamos la lista de "managers" que devuelve ese endpoint, o todos los empleados si prefieres
          setCandidates(data.managers || []);
        }
      } catch (error) {
        console.error("Error cargando recursos", error);
      }
    }
    fetchResources();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return alert("El nombre es obligatorio");

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        leadId: form.leadId === "none" ? null : form.leadId,
      };

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Error al crear el equipo");
      }

      // Éxito: redirigir a la lista
      router.refresh(); // Limpiar caché de rutas
      router.push("/team");

    } catch (error) {
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Equipo <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          placeholder="Ej: Ingeniería, Marketing, Squad Alpha..."
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead">Líder del Equipo (Opcional)</Label>
        <Select
          value={form.leadId}
          onValueChange={(val) => setForm({ ...form, leadId: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar líder..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- Sin asignar --</SelectItem>
            {candidates.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? "Usuario sin nombre"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          El líder tendrá visibilidad sobre la carga laboral de los miembros.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Breve descripción de las responsabilidades..."
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Link href="/team">
          <Button type="button" variant="outline" disabled={loading}>
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Crear Equipo
        </Button>
      </div>
    </form>
  );
}