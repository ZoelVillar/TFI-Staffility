// app/(app)/profile/page.tsx
import { getServerSession } from "next-auth";
import React from "react";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  UserCheck,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

// Helper para formatear fechas
const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export default async function ProfilePage() {
  // 1. Validación de Sesión
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const userId = (session.user as any).id;

  // 2. Obtención de Datos (Optimizado en una sola query principal)
  // Incluimos métricas básicas como conteo de tareas y último score de burnout
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      manager: {
        select: { name: true, email: true }
      },
      company: {
        select: { companyName: true }
      },
      // Métricas: Tareas
      tasksOwned: {
        select: { status: true },
      },
      // Métricas: Último snapshot de carga
      workloadSnapshots: {
        orderBy: { weekStart: 'desc' },
        take: 1,
        select: { utilizationPct: true, riskLevel: true }
      },
      // Métricas: Último score de burnout
      SurveyResponse: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: { scoreTotal: true }
      }
    }
  });

  if (!user) redirect("/auth/login");

  // 3. Procesamiento de Métricas
  const totalTasks = user.tasksOwned.length;
  const pendingTasks = user.tasksOwned.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED').length;
  const completedTasks = user.tasksOwned.filter(t => t.status === 'DONE').length;
  
  const lastSnapshot = user.workloadSnapshots[0];
  const lastBurnout = user.SurveyResponse[0];

  // Iniciales para avatar
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* --- SECCIÓN 1: CABECERA --- */}
      <Card className="border-none shadow-md bg-gradient-to-r from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <CardContent className="p-8 flex flex-col md:flex-row items-center md:items-start gap-8">
          <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
            <AvatarImage src={user.image ?? ""} alt={user.name ?? "Usuario"} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center md:items-baseline gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'} className="uppercase tracking-wider text-[10px]">
                {user.status === 'ACTIVE' ? 'Activo' : user.status}
              </Badge>
            </div>
            
            <p className="text-lg text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
              <Briefcase className="h-4 w-4" />
              {user.position ?? "Sin puesto definido"} 
              <span className="text-gray-300">•</span> 
              {user.company.companyName}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground pt-2">
              {user.locationCity && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {user.locationCity}, {user.locationCountry}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- SECCIÓN 2: MÉTRICAS (KPIs) --- */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Métricas Personales
              </CardTitle>
              <CardDescription>Resumen de tu actividad reciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Tareas */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tareas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border border-orange-100 dark:border-orange-900">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingTasks}</div>
                    <div className="text-xs text-orange-700/80 dark:text-orange-400/80 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Pendientes
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-100 dark:border-green-900">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasks}</div>
                    <div className="text-xs text-green-700/80 dark:text-green-400/80 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Completadas
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Carga y Bienestar */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bienestar & Carga</h4>
                
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <span className="text-sm font-medium">Nivel de Utilización</span>
                  <Badge variant={
                    (lastSnapshot?.utilizationPct ?? 0) > 100 ? "destructive" : 
                    (lastSnapshot?.utilizationPct ?? 0) > 80 ? "secondary" : "outline" // Ajustar a "default" si usas variant success personalizado
                  }>
                    {lastSnapshot?.utilizationPct ?? 0}%
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <span className="text-sm font-medium">Score Burnout</span>
                  <span className={`text-sm font-bold ${
                    Number(lastBurnout?.scoreTotal ?? 0) > 60 ? "text-red-500" : "text-emerald-600"
                  }`}>
                    {lastBurnout?.scoreTotal ? Number(lastBurnout.scoreTotal).toFixed(1) : "—"}
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* --- SECCIÓN 3: DETALLE DE INFORMACIÓN --- */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Laboral</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <InfoItem 
                icon={<Briefcase />} 
                label="Departamento" 
                value={user.department} 
              />
              <InfoItem 
                icon={<UserCheck />} 
                label="Reporta a" 
                value={user.manager?.name ?? "Sin asignar"} 
              />
              <InfoItem 
                icon={<Activity />} 
                label="Seniority" 
                value={user.seniority} 
              />
              <InfoItem 
                icon={<MapPin />} 
                label="Modalidad" 
                value={user.workMode} 
              />
              <InfoItem 
                icon={<Clock />} 
                label="Jornada" 
                value={user.employmentType?.replace("_", " ")} 
              />
              <InfoItem 
                icon={<Calendar />} 
                label="Fecha de ingreso" 
                value={formatDate(user.startDate)} 
              />

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capacidad Configurada</CardTitle>
              <CardDescription>Parámetros usados para el cálculo de tu carga laboral.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{user.capacityHoursPerWeek ?? "40"}</div>
                <div className="text-xs text-muted-foreground uppercase mt-1">Horas / Semana</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{user.capacitySpPerWeek ?? "—"}</div>
                <div className="text-xs text-muted-foreground uppercase mt-1">SP / Semana</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{user.hoursPerStoryPoint ?? "—"}</div>
                <div className="text-xs text-muted-foreground uppercase mt-1">Horas / SP</div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

// Componente auxiliar para ítems de información
function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-muted rounded-md text-muted-foreground">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
        <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}