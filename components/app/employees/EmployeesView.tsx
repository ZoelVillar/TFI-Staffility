// components/app/employees/EmployeesView.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmployeeCard from "./EmployeeCard";

type Employee = {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
  image: string | null;
  phone: string | null;
  department: string | null;
  workMode: string | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  createdAt: string;
};

type Kpis = {
  total: number;
  activos: number;
  inactivos: number;
  remotos: number;
};

export default function EmployeesView() {
  const [items, setItems] = useState<Employee[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    total: 0,
    activos: 0,
    inactivos: 0,
    remotos: 0,
  });
  const [cursor, setCursor] = useState<string | null>(null);
  const [take] = useState(12);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [filters, setFilters] = useState({ name: "", email: "", phone: "" });
  const debounced = useDebounce(filters, 350);

  // Lazy load
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const canLoadMore = cursor !== null;

  // Fetch función reutilizable
  async function fetchPage(opts?: { reset?: boolean }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("take", String(take));
      if (!opts?.reset && cursor) params.set("cursor", cursor);
      if (debounced.name) params.set("name", debounced.name);
      if (debounced.email) params.set("email", debounced.email);
      if (debounced.phone) params.set("phone", debounced.phone);

      const res = await fetch(`/api/users?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Error al cargar empleados");
      const data = (await res.json()) as {
        employees: Employee[];
        nextCursor: string | null;
        kpis: Kpis;
      };

      setKpis(data.kpis);
      setCursor(data.nextCursor ?? null);
      setItems((prev) =>
        opts?.reset ? data.employees : [...prev, ...data.employees]
      );
    } finally {
      setLoading(false);
    }
  }

  // Primera carga y cada vez que cambian filtros (reset)
  useEffect(() => {
    startTransition(() => {
      setCursor(null);
      fetchPage({ reset: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced.name, debounced.email, debounced.phone]);

  // IntersectionObserver para lazy load
  useEffect(() => {
    if (!loaderRef.current) return;
    const el = loaderRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && canLoadMore && !loading) fetchPage();
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.unobserve(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaderRef.current, canLoadMore, loading, cursor, debounced]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Izquierda: Cards de empleados */}
      <div className="lg:col-span-8 space-y-4">
        {items.length === 0 && !loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Sin resultados
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((emp) => (
              <EmployeeCard key={emp.id} emp={emp} />
            ))}
          </div>
        )}
        {/* Loader para lazy load */}
        <div ref={loaderRef} />
        {loading && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Cargando...
          </p>
        )}
        {!canLoadMore && items.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No hay más resultados
          </p>
        )}
      </div>

      {/* Derecha: KPIs + Agregar + Filtros */}
      <aside className="lg:col-span-4 space-y-4">
        <Card className="bg-gradient-to-br from-muted/40 to-background border-muted/50">
          <CardHeader>
            <CardTitle>KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Total" value={kpis.total} />
              <Kpi label="Activos" value={kpis.activos} />
              <Kpi label="Inactivos" value={kpis.inactivos} />
              <Kpi label="Remotos" value={kpis.remotos} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/employee">
              <Button>Agregar empleado</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nombre"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={filters.email}
              onChange={(e) =>
                setFilters({ ...filters, email: e.target.value })
              }
            />
            <Input
              placeholder="Teléfono"
              value={filters.phone}
              onChange={(e) =>
                setFilters({ ...filters, phone: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setFilters({ name: "", email: "", phone: "" });
                }}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

// Debounce hook
function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
