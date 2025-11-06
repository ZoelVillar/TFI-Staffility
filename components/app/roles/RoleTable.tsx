"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
};

export default function RoleTable({ refreshKey }: { refreshKey: number }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/system/roles", { cache: "no-store" });
    const data = await res.json();
    setRoles(data);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este rol?")) return;
    const res = await fetch(`/api/system/roles/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="rounded-lg border p-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Nombre</th>
            <th className="text-left">Descripción</th>
            <th className="text-left">Permisos</th>
            <th className="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="font-medium">{r.name}</td>
              <td>{r.description ?? "—"}</td>
              <td className="text-xs text-muted-foreground">
                {r.permissions.join(", ")}
              </td>
              <td className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remove(r.id)}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
          {roles.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="py-6 text-center text-muted-foreground"
              >
                Sin roles creados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
