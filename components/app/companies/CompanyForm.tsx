"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CompanyForm() {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    phone: "",
    numEmployees: 0,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error al crear empresa");
      window.location.reload();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
      <Input
        placeholder="Nombre de la empresa"
        required
        value={form.companyName}
        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
      />
      <Input
        placeholder="Nombre de contacto"
        required
        value={form.contactName}
        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
      />
      <Input
        type="email"
        placeholder="Correo de contacto"
        required
        value={form.contactEmail}
        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
      />
      <Input
        placeholder="Teléfono"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <Input
        type="number"
        placeholder="N° de empleados"
        value={form.numEmployees}
        onChange={(e) =>
          setForm({ ...form, numEmployees: Number(e.target.value) })
        }
      />
      <Button type="submit" disabled={loading} className="col-span-2">
        {loading ? "Guardando..." : "Crear empresa"}
      </Button>
    </form>
  );
}
