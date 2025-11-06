"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ActivateButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState(active);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/company/${id}/activate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      const { updated } = await res.json();
      setState(updated.active);
    } catch (e) {
      alert("Error al activar/desactivar empresa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={state ? "destructive" : "default"}
      size="sm"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? "..." : state ? "Desactivar" : "Activar"}
    </Button>
  );
}
