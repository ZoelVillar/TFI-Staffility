"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Team = { id: string; name: string };

export default function CreateCampaignDialog({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"ALL" | "TEAMS">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || scope !== "TEAMS") return;
    // Endpoint simple de teams de la compañía (id, name)
    // Si no lo tenés, lo armamos en /api/teams
    fetch("/api/teams", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { teams: Team[] }) => setTeams(data.teams ?? []))
      .catch(() => setTeams([]));
  }, [open, scope]);

  async function submit() {
    if (!name || !startDate || !endDate) {
      alert("Completá nombre y fechas.");
      return;
    }
    if (scope === "TEAMS") {
      const picked = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (picked.length === 0) {
        alert("Seleccioná al menos un equipo.");
        return;
      }
    }

    setLoading(true);
    try {
      const body: any = { name, scope, startDate, endDate };
      if (scope === "TEAMS") {
        body.teamIds = Object.entries(selected)
          .filter(([, v]) => v)
          .map(([k]) => k);
      }
      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("No se pudo crear la campaña");
      setOpen(false);
      setName("");
      setSelected({});
      setScope("ALL");
      setStartDate("");
      setEndDate("");
      onCreated?.();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Crear</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear campaña</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-1">
            <label className="text-sm">Nombre</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: MBI Q3/2025"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm">Alcance</label>
            <select
              className="border rounded-md p-2 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as "ALL" | "TEAMS")}
            >
              <option value="ALL">Todos</option>
              <option value="TEAMS">Equipos específicos</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <label className="text-sm">Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm">Fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {scope === "TEAMS" && (
            <div className="grid gap-2">
              <label className="text-sm">Equipos</label>
              <div className="max-h-48 overflow-auto border rounded-md p-2">
                {teams.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={!!selected[t.id]}
                      onChange={(e) =>
                        setSelected((s) => ({ ...s, [t.id]: e.target.checked }))
                      }
                    />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
                {teams.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No hay equipos disponibles.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
