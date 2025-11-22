// app/(app)/employees/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Mail, Phone, MapPin, Briefcase, Calendar, UserCheck, 
  Activity, Clock, AlertCircle, CheckCircle2, ChevronLeft 
} from "lucide-react";
import React from "react";

// Helper de formato de fecha (Reutilizable)
const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(date);
};

// Helper de UI para Items (Reutilizable)
function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-muted rounded-md text-muted-foreground shrink-0">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground uppercase truncate">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value ?? "—"}</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeProfilePage({ params }: PageProps) {
  // 1. Autenticación y Permisos
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  // Validación de permiso estricta (RBAC)
  if (!hasAnyPermission(session.user, [PERMISSIONS.USERS_VIEW])) {
    redirect("/dashboard?error=SinPermisos");
  }

  const { id: employeeId } = await params;
  const viewerCompanyId = (session.user as any).companyId;

  // 2. Consulta Multi-tenant (Source of Truth)
  // Buscamos el empleado ASEGURANDO que coincida el companyId
  const employee = await prisma.user.findFirst({
    where: { 
      id: employeeId,
      companyId: viewerCompanyId // <--- CLAVE: Tenant isolation
    },
    include: {
      role: true,
      manager: { select: { name: true, email: true } },
      company: { select: { companyName: true } },
      // Métricas operativas
      tasksOwned: { select: { status: true } },
      // Último snapshot de carga laboral
      workloadSnapshots: {
        orderBy: { weekStart: 'desc' },
        take: 1,
        select: { utilizationPct: true }
      },
      // Última encuesta (Score de Burnout)
      SurveyResponse: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: { scoreTotal: true }
      }
    }
  });

  if (!employee) notFound();

  // 3. Procesamiento de KPIs (Business Logic)
  const pendingTasks = employee.tasksOwned.filter(t => 
    ['PENDING', 'IN_PROGRESS', 'BLOCKED'].includes(t.status)
  ).length;
  const completedTasks = employee.tasksOwned.filter(t => t.status === 'DONE').length;
  
  const utilization = employee.workloadSnapshots[0]?.utilizationPct ?? 0;
  const burnoutScore = Number(employee.SurveyResponse[0]?.scoreTotal ?? 0);

  // Iniciales
  const initials = employee.name
    ? employee.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "EM";

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Navegación Superior */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/employees/view">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 hover:bg-transparent hover:text-primary">
            <ChevronLeft className="h-4 w-4" /> Volver al listado
          </Button>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">Perfil de Empleado</span>
      </div>

      {/* Tarjeta Principal de Identidad */}
      <Card className="border-none shadow-md bg-gradient-to-r from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
          <Avatar className="w-28 h-28 md:w-32 md:h-32 border-4 border-white shadow-lg shrink-0">
            <AvatarImage src={employee.image ?? ""} alt={employee.name ?? "Empleado"} />
            <AvatarFallback className="text-3xl bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left space-y-3 w-full">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {employee.name}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                  <Badge variant="secondary" className="font-medium text-xs px-2 py-0.5 border-primary/20 text-primary bg-primary/5">
                    {employee.role?.name ?? "Sin Rol"}
                  </Badge>
                  <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'outline'} className="text-[10px] tracking-wider uppercase">
                    {employee.status === 'ACTIVE' ? 'Activo' : employee.status === 'ON_LEAVE' ? 'Licencia' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
              
              {/* Acciones (Placeholder para futuras funciones) */}
              <div className="flex gap-2">
                {/* Aquí podrías agregar botones como "Editar", "Enviar Mensaje", etc. */}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm text-muted-foreground pt-2 border-t border-border/50 mt-2">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Briefcase className="h-4 w-4 opacity-70" />
                <span className="truncate">{employee.position ?? "Puesto no definido"}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="h-4 w-4 opacity-70" />
                <span className="truncate">{employee.email}</span>
              </div>
              {employee.locationCity && (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <MapPin className="h-4 w-4 opacity-70" />
                  <span>{employee.locationCity}, {employee.locationCountry}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA: Detalles */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Información Organizacional
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem icon={<Briefcase />} label="Departamento" value={employee.department} />
              <InfoItem icon={<UserCheck />} label="Manager / Reporta a" value={employee.manager?.name} />
              <InfoItem icon={<Activity />} label="Seniority" value={employee.seniority} />
              <InfoItem icon={<MapPin />} label="Modalidad" value={employee.workMode} />
              <InfoItem icon={<Clock />} label="Tipo Contrato" value={employee.employmentType?.replace(/_/g, " ")} />
              <InfoItem icon={<Calendar />} label="Fecha de Ingreso" value={formatDate(employee.startDate)} />
              <InfoItem icon={<Phone />} label="Teléfono" value={employee.phone} />
            </CardContent>
          </Card>

          {/* Sección de configuración de capacidad (Solo visible para Managers/Admins teóricamente) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Configuración de Capacidad
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">Horas / Semana</div>
                <div className="text-xl font-semibold">{employee.capacityHoursPerWeek ?? "40"}</div>
              </div>
              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">Story Points / Sem</div>
                <div className="text-xl font-semibold">{employee.capacitySpPerWeek ?? "—"}</div>
              </div>
              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">Horas / SP</div>
                <div className="text-xl font-semibold">{employee.hoursPerStoryPoint ?? "—"}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: KPIs y Resumen */}
        <div className="space-y-6">
          <Card className="h-full border-l-4 border-l-primary/20">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Snapshot de Actividad</CardTitle>
              <CardDescription>Estado actual y métricas clave</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Estado de Tareas */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tareas Asignadas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/50">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingTasks}</div>
                    <div className="text-[10px] text-orange-700/70 dark:text-orange-400/70 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" /> Pendientes
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</div>
                    <div className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Completadas
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Indicadores de Riesgo */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salud & Carga</h4>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Carga Laboral (Semanal)</span>
                    <Badge variant={utilization > 100 ? "destructive" : utilization > 85 ? "secondary" : "outline"}>
                      {utilization}%
                    </Badge>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${utilization > 100 ? 'bg-red-500' : utilization > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-medium">Índice de Burnout</span>
                  <span className={`text-lg font-bold ${burnoutScore > 60 ? "text-red-500" : "text-emerald-600"}`}>
                    {burnoutScore > 0 ? burnoutScore.toFixed(1) : "N/A"}
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}