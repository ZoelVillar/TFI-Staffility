// src/components/app/NavGroupsAccordion.tsx
"use client";

import { useState, useMemo } from "react";
import NavGroup from "./NavGroup";

type Group = {
  label: string;
  icon?: React.ReactNode;
  items: { label: string; href: string }[];
};

export default function NavGroupsAccordion({ groups }: { groups: Group[] }) {
  // solo uno abierto a la vez: guardamos el label del grupo abierto
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  // Si el label actual ya no existe (cambio de permisos/ruta), cerramos
  useMemo(() => {
    if (openLabel && !groups.some((g) => g.label === openLabel)) {
      setOpenLabel(null);
    }
  }, [groups, openLabel]);

  return (
    <>
      {groups.map((group) => (
        <NavGroup
          key={group.label}
          label={group.label}
          icon={group.icon}
          items={group.items}
          open={openLabel === group.label}
          onToggle={() =>
            setOpenLabel((curr) => (curr === group.label ? null : group.label))
          }
        />
      ))}
    </>
  );
}
