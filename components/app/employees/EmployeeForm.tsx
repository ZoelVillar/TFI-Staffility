// components/app/employees/EmployeeForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Esquema de validación Frontend
const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  roleId: z.string().min(1, "Selecciona un rol"),
  position: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional(), // Puede ser "none" o UUID
  workMode: z.enum(["ONSITE", "HYBRID", "REMOTE"]),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN"]),
  seniority: z.enum(["JR", "SSR", "SR"]),
  capacityHoursPerWeek: z.coerce.number().min(0).max(168).default(40),
});

type FormValues = z.infer<typeof formSchema>;

export default function EmployeeForm() {
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string | null }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "", // En producción, idealmente enviar invitación por email
      roleId: "",
      workMode: "HYBRID",
      employmentType: "FULL_TIME",
      seniority: "SSR",
      capacityHoursPerWeek: 40,
      managerId: "none", // Valor centinela para select
    },
  });

  // 1. Cargar metadatos (Roles y Managers) al montar
  useEffect(() => {
    async function loadResources() {
      try {
        const res = await fetch("/api/company/resources");
        if (!res.ok) throw new Error("Error cargando recursos");
        const data = await res.json();
        setRoles(data.roles);
        setManagers(data.managers);
      } catch (e) {
        console.error(e);
        setServerError("No se pudieron cargar los roles o managers. Recarga la página.");
      } finally {
        setLoadingData(false);
      }
    }
    loadResources();
  }, []);

  // 2. Envío del formulario
  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSuccess(false);

    try {
      // Limpieza de datos antes de enviar
      const payload = {
        ...data,
        managerId: data.managerId === "none" ? null : data.managerId,
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error al crear el empleado");
      }

      setSuccess(true);
      form.reset();
      // Recarga forzada para actualizar la tabla de empleados (podría ser más suave con router.refresh)
      window.location.reload();
    } catch (error) {
      setServerError((error as Error).message);
    }
  }

  const { register, formState: { errors, isSubmitting }, setValue, watch } = form;

  if (loadingData) {
    return <div className="p-8 text-center text-muted-foreground flex justify-center items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Cargando formulario...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* SECCIÓN 1: DATOS DE CUENTA */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cuenta de Acceso</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre Completo</Label>
            <Input placeholder="Ej: Juan Pérez" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Email Corporativo</Label>
            <Input type="email" placeholder="juan@empresa.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Contraseña Inicial</Label>
            <Input type="password" placeholder="******" {...register("password")} />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Rol en Plataforma</Label>
            <Select onValueChange={(val) => setValue("roleId", val)} value={watch("roleId")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && <p className="text-xs text-red-500">{errors.roleId.message}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* SECCIÓN 2: INFORMACIÓN LABORAL */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detalle Laboral</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="space-y-2">
            <Label>Puesto / Cargo</Label>
            <Input placeholder="Ej: Frontend Developer" {...register("position")} />
          </div>

          <div className="space-y-2">
            <Label>Departamento</Label>
            <Input placeholder="Ej: Ingeniería" {...register("department")} />
          </div>

          <div className="space-y-2">
            <Label>Seniority</Label>
            <Select onValueChange={(val: any) => setValue("seniority", val)} value={watch("seniority")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="JR">Junior</SelectItem>
                <SelectItem value="SSR">Semi-Senior</SelectItem>
                <SelectItem value="SR">Senior</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modalidad</Label>
            <Select onValueChange={(val: any) => setValue("workMode", val)} value={watch("workMode")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ONSITE">Presencial</SelectItem>
                <SelectItem value="HYBRID">Híbrido</SelectItem>
                <SelectItem value="REMOTE">Remoto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo Contrato</Label>
            <Select onValueChange={(val: any) => setValue("employmentType", val)} value={watch("employmentType")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_TIME">Full Time</SelectItem>
                <SelectItem value="PART_TIME">Part Time</SelectItem>
                <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                <SelectItem value="INTERN">Pasante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Capacidad (Horas/Semana)</Label>
            <Input type="number" {...register("capacityHoursPerWeek")} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Reporta a (Manager)</Label>
            <Select onValueChange={(val) => setValue("managerId", val)} value={watch("managerId")}>
              <SelectTrigger>
                <SelectValue placeholder="Sin manager asignado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Nadie / Sin asignar --</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? "Usuario sin nombre"} {m.position ? `(${m.position})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input placeholder="+54 9 11..." {...register("phone")} />
          </div>

        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Crear Empleado
            </>
          )}
        </Button>
      </div>
    </form>
  );
}