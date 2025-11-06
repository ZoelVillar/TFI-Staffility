"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
type TeamDTO = {
  id: string;
  name: string;
  description: string | null;
  leadId: string | null;
  lead: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

export default function TeamDetailView({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<TeamDTO | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(
        `/api/team/${teamId}/members?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("No se pudieron cargar miembros del equipo");
      const data = (await res.json()) as { team: TeamDTO; members: Member[] };

      console.log(res);
      setTeam(data.team);
      setMembers(data.members);

      console.log("Fetched team details:", data.team);
      console.log("Fetched team members:", data.members);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{team?.name ?? "Equipo"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {team?.description ?? "—"}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="Buscar miembro (nombre, rol, email)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Miembros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-muted/30">
                  <th className="py-3 pl-4">Miembro</th>
                  <th>Rol</th>
                  <th>Seniority</th>
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
                      colSpan={5}
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
  );
}
