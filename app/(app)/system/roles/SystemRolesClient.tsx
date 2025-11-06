"use client";

import { useState } from "react";
import RoleForm from "@/components/app/roles/RoleForm";
import RoleTable from "@/components/app/roles/RoleTable";

export default function SystemRolesClient() {
  // clave para forzar reload del listado al crear/editar/eliminar
  const [refreshKey, setRefreshKey] = useState(0);

  function bump() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <RoleForm onAfterSave={bump} />
      <RoleTable refreshKey={refreshKey} />
    </div>
  );
}
