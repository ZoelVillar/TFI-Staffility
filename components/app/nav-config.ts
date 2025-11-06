// src/components/app/nav-config.ts
import { PERMISSIONS } from "@/config/roles";

type NavItem = {
  label: string;
  href: string;
  requiredPerm?: string;
};

export type NavGroup = {
  label: string;
  icon?: React.ReactNode; // si querés iconos
  items: NavItem[];
  // si el usuario NO tiene ninguno de los perms de items → se oculta el grupo completo
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Usuarios",
    items: [
      {
        label: "Ver usuarios",
        href: "/employees/view",
        requiredPerm: PERMISSIONS.USERS_VIEW,
      },
      {
        label: "Gestionar usuarios",
        href: "/employees",
        requiredPerm: PERMISSIONS.USERS_MANAGE,
      },
    ],
  },
  {
    label: "Roles",
    items: [
      {
        label: "Ver roles",
        href: "/admin/roles",
        requiredPerm: PERMISSIONS.ROLES_VIEW,
      },
      {
        label: "Crear rol",
        href: "/admin/roles/new",
        requiredPerm: PERMISSIONS.ROLES_MANAGE,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        label: "Empresas",
        href: "/companies",
        requiredPerm:
          PERMISSIONS.COMPANIES_VIEW || PERMISSIONS.SYSTEM_COMPANIES_VIEW,
      },
    ],
  },
];
