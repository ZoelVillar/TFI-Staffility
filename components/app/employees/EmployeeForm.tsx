// components/app/employees/EmployeeForm.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  name: string;
  email: string;
  password: string;
  roleId: string; // requerido

  position?: string;
  department?: string;
  phone?: string;
  image?: string;

  workMode?: "ONSITE" | "HYBRID" | "REMOTE";
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN";
  seniority?: "JR" | "SSR" | "SR";
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";

  managerId?: string;
  locationCity?: string;
  locationCountry?: string;
  startDate?: string;
  endDate?: string;

  capacityHoursPerWeek?: number;
  capacitySpPerWeek?: number;
  hoursPerStoryPoint?: number;
};

export default function EmployeeForm({
  defaultRoleId,
}: {
  defaultRoleId?: string;
}) {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "Inicio123", // default rápido (ajústalo si querés)
    roleId: defaultRoleId ?? "",
    position: "",
    department: "",
    phone: "",
    image: "",
    workMode: undefined,
    employmentType: undefined,
    seniority: undefined,
    status: "ACTIVE",
    managerId: "",
    locationCity: "",
    locationCountry: "",
    startDate: "",
    endDate: "",
    capacityHoursPerWeek: undefined,
    capacitySpPerWeek: undefined,
    hoursPerStoryPoint: undefined,
  });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.email || !form.password || !form.roleId) {
        alert("Falta email / password / rol");
        return;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Error al crear empleado");
      }
      // refrescamos la página para ver el listado actualizado
      window.location.reload();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Nombre</Label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Juan Pérez"
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="juan@empresa.com"
          required
        />
      </div>
      <div>
        <Label>Contraseña</Label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          required
        />
      </div>
      <div>
        <Label>Rol (roleId)</Label>
        <Input
          value={form.roleId}
          onChange={(e) => set("roleId", e.target.value)}
          placeholder="ID del rol (ej. Administrador/Manager)"
          required
        />
        {/* Si querés, acá podés cambiar por un <Select> populado desde /api/roles */}
      </div>

      <div>
        <Label>Puesto</Label>
        <Input
          value={form.position ?? ""}
          onChange={(e) => set("position", e.target.value)}
          placeholder="Desarrollador"
        />
      </div>
      <div>
        <Label>Departamento</Label>
        <Input
          value={form.department ?? ""}
          onChange={(e) => set("department", e.target.value)}
          placeholder="IT"
        />
      </div>
      <div>
        <Label>Teléfono</Label>
        <Input
          value={form.phone ?? ""}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+54..."
        />
      </div>
      <div>
        <Label>Avatar (URL)</Label>
        <Input
          value={form.image ?? ""}
          onChange={(e) => set("image", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <Label>Modo de trabajo</Label>
        <Select
          value={form.workMode}
          onValueChange={(v) => set("workMode", v as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ONSITE">On-site</SelectItem>
            <SelectItem value="HYBRID">Híbrido</SelectItem>
            <SelectItem value="REMOTE">Remoto</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tipo de empleo</Label>
        <Select
          value={form.employmentType}
          onValueChange={(v) => set("employmentType", v as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL_TIME">Full-time</SelectItem>
            <SelectItem value="PART_TIME">Part-time</SelectItem>
            <SelectItem value="CONTRACTOR">Contractor</SelectItem>
            <SelectItem value="INTERN">Intern</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Seniority</Label>
        <Select
          value={form.seniority}
          onValueChange={(v) => set("seniority", v as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="JR">JR</SelectItem>
            <SelectItem value="SSR">SSR</SelectItem>
            <SelectItem value="SR">SR</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Estado</Label>
        <Select
          value={form.status}
          onValueChange={(v) => set("status", v as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Activo por defecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Activo</SelectItem>
            <SelectItem value="INACTIVE">Inactivo</SelectItem>
            <SelectItem value="ON_LEAVE">En licencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>ManagerId (opcional)</Label>
        <Input
          value={form.managerId ?? ""}
          onChange={(e) => set("managerId", e.target.value)}
          placeholder="cuid() del manager"
        />
      </div>
      <div>
        <Label>Ciudad</Label>
        <Input
          value={form.locationCity ?? ""}
          onChange={(e) => set("locationCity", e.target.value)}
          placeholder="Buenos Aires"
        />
      </div>
      <div>
        <Label>País</Label>
        <Input
          value={form.locationCountry ?? ""}
          onChange={(e) => set("locationCountry", e.target.value)}
          placeholder="Argentina"
        />
      </div>
      <div>
        <Label>Fecha inicio</Label>
        <Input
          type="date"
          value={form.startDate ?? ""}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </div>
      <div>
        <Label>Fecha fin</Label>
        <Input
          type="date"
          value={form.endDate ?? ""}
          onChange={(e) => set("endDate", e.target.value)}
        />
      </div>

      <div>
        <Label>Capacidad (hs/sem)</Label>
        <Input
          type="number"
          value={form.capacityHoursPerWeek ?? ""}
          onChange={(e) =>
            set(
              "capacityHoursPerWeek",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          placeholder="40"
        />
      </div>
      <div>
        <Label>Capacidad (SP/sem)</Label>
        <Input
          type="number"
          value={form.capacitySpPerWeek ?? ""}
          onChange={(e) =>
            set(
              "capacitySpPerWeek",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          placeholder="18"
        />
      </div>
      <div>
        <Label>Horas por SP</Label>
        <Input
          type="number"
          value={form.hoursPerStoryPoint ?? ""}
          onChange={(e) =>
            set(
              "hoursPerStoryPoint",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          placeholder="5"
        />
      </div>

      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear empleado"}
        </Button>
      </div>
    </form>
  );
}
