// components/app/dashboard/DashboardView.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Users,
  LayoutGrid,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  ListTodo,
  FileText,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// --- Tipos y Estilos ---

type UserProp = {
  id: string;
  name: string | null;
  email: string;
  role: { name: string | null };
};

type DashboardData = {
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  kpis: {
    label: string;
    value: string | number;
    status?: "success" | "warning" | "danger" | "neutral" | "primary";
    icon?: string;
  }[];
  charts: {
    burnoutTrend: { name: string; value: number }[];
    taskDistribution: { name: string; value: number; fill: string }[];
  };
  actionItems: {
    id: string;
    title: string;
    type: "danger" | "warning" | "info" | "success";
    link?: string;
  }[];
};

const ICONS: Record<string, any> = {
  users: Users,
  grid: LayoutGrid,
  activity: Activity,
  alert: AlertTriangle,
  check: CheckCircle2,
  play: PlayCircle,
  list: ListTodo,
  file: FileText,
};

const ACTION_STYLES: Record<string, string> = {
  danger: "bg-red-50 border-red-100 text-red-900 [&_svg]:text-red-600",
  warning: "bg-amber-50 border-amber-100 text-amber-900 [&_svg]:text-amber-600",
  info: "bg-blue-50 border-blue-100 text-blue-900 [&_svg]:text-blue-600",
  success:
    "bg-emerald-50 border-emerald-100 text-emerald-900 [&_svg]:text-emerald-600",
};

export default function DashboardView({ user }: { user: UserProp }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Error fetching dashboard");
        return r.json();
      })
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <DashboardSkeleton />;
  const firstName = user.name ? user.name.split(" ")[0] : "Usuario";

  if (loading) return <DashboardSkeleton />;
  if (!data)
    return (
      <div className="p-8 text-center text-muted-foreground">
        No se pudieron cargar los datos.
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Hola, {firstName}{" "}
            <span className="animate-wave inline-block">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {data.role === "ADMIN" &&
              "Panorama estratégico de toda la organización."}
            {data.role === "MANAGER" &&
              "Estado operativo de tus equipos y miembros."}
            {data.role === "EMPLOYEE" && "Tu centro de comando personal."}
          </p>
        </div>

        <div className="flex gap-3">
          {data.role === "EMPLOYEE" ? (
            <Link href="/my-work">
              <Button className="shadow-lg shadow-primary/20">
                Ir a mis tareas
              </Button>
            </Link>
          ) : (
            <Link href="/team/workload">
              <Button variant="default" className="shadow-lg shadow-primary/20">
                Ver Cargas
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 2. KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.kpis.map((kpi, idx) => {
          const Icon = ICONS[kpi.icon || "activity"] ?? Activity;
          const statusColors =
            kpi.status === "danger"
              ? "text-red-600 bg-red-50 border-red-200"
              : kpi.status === "warning"
              ? "text-amber-600 bg-amber-50 border-amber-200"
              : kpi.status === "success"
              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : "text-slate-600 bg-slate-50 border-slate-200";

          return (
            <Card
              key={idx}
              className="overflow-hidden hover:shadow-md transition-shadow border-l-4"
              style={{
                borderLeftColor:
                  kpi.status === "danger" ? "#ef4444" : "var(--primary)",
              }}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <h3 className="text-3xl font-bold mt-2 tracking-tight">
                      {kpi.value}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl border ${statusColors}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Main Content (Chart + Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA (2/3): Gráficos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gráfico para ADMIN/MANAGER: Tendencia */}
          {(data.role === "ADMIN" || data.role === "MANAGER") && (
            <Card className="h-full min-h-[350px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Evolución de
                  Bienestar
                </CardTitle>
                <CardDescription>
                  Tendencia histórica del score de estrés (últimos 6 meses)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data.charts.burnoutTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.charts.burnoutTrend}>
                      <defs>
                        <linearGradient
                          id="colorBurnout"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#f43f5e"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#f43f5e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(val: number) => [val, "Score"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorBurnout)"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No hay datos históricos suficientes.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gráfico para EMPLEADO: Distribución de Carga */}
          {data.role === "EMPLOYEE" && (
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Mi Capacidad Semanal</CardTitle>
                <CardDescription>
                  Horas asignadas vs Capacidad total disponible
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.taskDistribution}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {data.charts.taskDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Texto central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                  <span className="text-4xl font-bold text-gray-800">
                    {data.kpis[0].value}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Carga
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* COLUMNA DERECHA (1/3): Alertas y Acciones */}
        <div className="space-y-6">
          <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Atención Requerida</CardTitle>
              <CardDescription>
                Eventos que requieren tu intervención inmediata.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              {data.actionItems.length > 0 ? (
                data.actionItems.map((item) => {
                  const style = ACTION_STYLES[item.type] ?? ACTION_STYLES.info;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${style}`}
                    >
                      <div className="mt-1">
                        {item.type === "danger" || item.type === "warning" ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-tight mb-1">
                          {item.title}
                        </p>
                        {item.link && (
                          <Link
                            href={item.link}
                            className="text-xs font-medium opacity-80 hover:opacity-100 hover:underline flex items-center gap-1 mt-2"
                          >
                            Resolver ahora <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-white border rounded-xl text-center shadow-sm">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full mb-3">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">
                    ¡Todo en orden!
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    No hay alertas críticas en este momento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-80 bg-muted rounded-xl animate-pulse" />
        <div className="h-80 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
