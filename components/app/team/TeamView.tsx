// components/app/team/TeamView.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Users,
  Briefcase,
  UserPlus,
  Search,
  LayoutGrid,
  Plus,
  BarChart3,
  Settings,
} from "lucide-react";

// Tipos alineados con la API
type TeamCardDTO = {
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
  _count: { memberships: number };
  createdAt: string;
};

type Kpis = {
  totalTeams: number;
  totalMembers: number;
  teamsLead: number;
  avgMembers: number;
};

export default function TeamView() {
  const [teams, setTeams] = useState<TeamCardDTO[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    totalTeams: 0,
    totalMembers: 0,
    teamsLead: 0,
    avgMembers: 0,
  });
  const [isManager, setIsManager] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);

      const res = await fetch(`/api/team/my?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("No se pudieron cargar equipos");
      const data = await res.json();

      setTeams(data.teams);
      setKpis(data.kpis);
      setIsManager(data.isManager);
    } finally {
      setLoading(false);
    }
  }

  // Debounce manual simple para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Equipos"
          value={kpis.totalTeams}
          icon={<LayoutGrid className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Total Miembros"
          value={kpis.totalMembers}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Promedio / Equipo"
          value={kpis.avgMembers}
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Mis Liderazgos"
          value={kpis.teamsLead}
          icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
          highlight={kpis.teamsLead > 0}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar equipos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        {/* Botón de Crear: Visible si la API dice que es Manager/Admin */}
        {isManager && (
          <Button className="w-full sm:w-auto gap-2 shadow-md" asChild>
            <Link href="/team/new">
              <Plus className="h-4 w-4" /> Crear Equipo
            </Link>
          </Button>
        )}
      </div>

      {/* Grid de Equipos */}
      {loading && teams.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
          <Users className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-3" />
          <h3 className="text-lg font-medium">No se encontraron equipos</h3>
          {isManager && (
            <p className="text-sm text-muted-foreground mt-1">
              Crea el primero para comenzar.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams.map((t) => (
            <Card
              key={t.id}
              className="h-full flex flex-col hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {t.description || "Sin descripción"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {t._count.memberships} miembros
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">Líder:</span>
                  {t.lead ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={t.lead.image ?? ""} />
                        <AvatarFallback className="text-[9px]">
                          {t.lead.name?.substring(0, 2).toUpperCase() ?? "TL"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {t.lead.name}
                      </span>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-200 text-amber-700 bg-amber-50"
                    >
                      Sin asignar
                    </Badge>
                  )}
                </div>
              </CardContent>

              {/* CORRECCIÓN AQUÍ: Uso de asChild para HTML válido */}
              <CardFooter className="pt-0 gap-2 border-t bg-muted/10 p-3">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                  asChild
                >
                  <Link href={`/team/${t.id}/workload`}>
                    <BarChart3 className="h-3 w-3" /> Workload
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  asChild
                >
                  <Link href={`/team/${t.id}`}>
                    <Settings className="h-3 w-3" /> Gestionar
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/20 bg-primary/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
