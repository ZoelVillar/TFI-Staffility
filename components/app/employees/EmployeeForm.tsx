// components/app/employees/AddEmployeeForm.tsx (opcional)
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AddEmployeeForm() {
  const [form, setForm] = useState({ name: "", email: "", position: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          password: "Inicio123",
          roleId: "cmhmliwuw0004tn6oite7nd3t", // tu rol “empleado” por defecto
        }),
      });
      if (!res.ok) throw new Error("Error al crear empleado");
      window.location.href = "/employees";
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-3">
      <Input
        placeholder="Nombre"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <Input
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />
      <Input
        placeholder="Puesto"
        value={form.position}
        onChange={(e) => setForm({ ...form, position: e.target.value })}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Crear"}
      </Button>
    </form>
  );
}
