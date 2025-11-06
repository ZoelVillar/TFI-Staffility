// components/app/team/TeamView.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

type Member = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  position: string | null;
  department: string | null;
  seniority: "JR" | "SSR" | "SR" | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
};

type Leader = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  position: string | null;
} | null;

export default function TeamView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [leader, setLeader] = useState<Leader>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      const res = await fetch(`/api/team/my?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo cargar Mi equipo");
      const data = (await res.json()) as { leader: Leader; members: Member[] };
      setLeader(data.leader);
      setMembers(data.members);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // primera carga
  useEffect(() => {
    const id = setTimeout(() => startTransition(load), 300);
    return () => clearTimeout(id);
  }, [q, role]); // filtro con debounce simple

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Izquierda: listado estilo “tabla moderna” */}
      <div className="lg:col-span-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Mi equipo</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <Input
                placeholder="Buscar por nombre, rol, email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Input
                placeholder="Filtrar por rol (ej. Desarrollador)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-muted/30">
                    <th className="py-3 pl-4">Miembro</th>
                    <th>Rol</th>
                    <th>Seniority</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th className="pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border">
                            <img
                              src={
                                m.image ||
                                `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                                  m.name ?? m.email
                                )}&size=64&radius=50`
                              }
                              alt={m.name ?? m.email}
                              className="w-8 h-8 object-cover"
                            />
                          </div>
                          <div className="leading-tight">
                            <div className="font-medium">
                              {m.name ?? "Sin nombre"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{m.position ?? "-"}</td>
                      <td>{m.seniority ?? "-"}</td>
                      <td>{/* podrías incluir teléfono si lo exponés */}</td>
                      <td>
                        <span
                          className={`text-xs px-2 py-1 rounded-full border
                          ${
                            m.status === "ACTIVE"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : m.status === "ON_LEAVE"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-rose-50 border-rose-200 text-rose-700"
                          }`}
                        >
                          {m.status === "ACTIVE"
                            ? "Activo"
                            : m.status === "ON_LEAVE"
                            ? "Vacaciones"
                            : "Inactivo"}
                        </span>
                      </td>
                      <td className="pr-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" disabled>
                            Ver perfil
                          </Button>
                          <Button size="sm" disabled>
                            Enviar mensaje
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Sin miembros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Derecha: panel líder + accesos (sin funcionalidad) */}
      <aside className="lg:col-span-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Mi líder</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border">
                <img
                  src={
                    leader?.image ||
                    `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                      leader?.name ?? leader?.email ?? "Leader"
                    )}&size=80&radius=50`
                  }
                  alt={leader?.name ?? "Líder"}
                  className="w-10 h-10 object-cover"
                />
              </div>
              <div className="leading-tight">
                <div className="font-medium">{leader?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {leader?.email ?? "—"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button disabled>Solicitar 1:1</Button>
              <Button variant="secondary" disabled>
                Ver agenda
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" disabled>
              Ver objetivos del equipo
            </Button>
            <Button variant="outline" disabled>
              Ver carga del equipo
            </Button>
            <Button variant="outline" disabled>
              Directorio de la empresa
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
