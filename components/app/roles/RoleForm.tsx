"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PERMISSIONS } from "@/config/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function RoleForm({
  onAfterSave,
}: {
  onAfterSave?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const togglePermission = (perm: string) => {
    setSelected((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/system/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissions: selected }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error al crear rol");
      }
      // limpiar y refrescar tabla
      setName("");
      setDescription("");
      setSelected([]);
      onAfterSave?.();
      router.refresh(); // refresca rutas server-side si algo depende de ellas
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nombre del rol</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: SystemAdmin"
            required
          />
        </div>
        <div>
          <Label>Descripción</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Permisos</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 border rounded p-3 max-h-[320px] overflow-y-auto">
          {Object.values(PERMISSIONS).map((perm) => (
            <label key={perm} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(perm)}
                onCheckedChange={() => togglePermission(perm)}
              />
              <span>{perm}</span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Crear rol"}
      </Button>
    </form>
  );
}
