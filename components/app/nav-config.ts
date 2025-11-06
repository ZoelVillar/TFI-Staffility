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
      {
        label: "Ver equipos",
        href: "/team",
        requiredPerm: PERMISSIONS.TEAM_VIEW,
      },
      {
        label: "Gestionar equipos",
        href: "/team",
        requiredPerm: PERMISSIONS.TEAM_MANAGE,
      },
    ],
  },
  {
    label: "Encuestas",
    items: [
      {
        label: "Ver encuestas",
        href: "/surveys/my",
        requiredPerm: PERMISSIONS.SURVEY_VIEW,
      },
      {
        label: "Gestionar encuestas",
        href: "/surveys",
        requiredPerm: PERMISSIONS.SURVEY_MANAGE,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        label: "Empresas",
        href: "/companies",
        requiredPerm: PERMISSIONS.SYSTEM_COMPANIES_VIEW,
      },

      {
        label: "Gestionar rol",
        href: "/system/roles",
        requiredPerm: PERMISSIONS.ROLES_MANAGE,
      },
    ],
  },
  ,
  {
    label: "Carga de trabajo",
    items: [
      {
        label: "Ver mi carga laboral",
        href: "/my-work",
        requiredPerm: PERMISSIONS.SURVEY_VIEW,
      },
      {
        label: "Ver carga laboral del equipo",
        href: "/team/workload",
        requiredPerm: PERMISSIONS.SURVEY_VIEW,
      },
    ],
  },
];
