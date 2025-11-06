// src/config/roles.ts

/** 1) Catálogo de permisos del sistema (única fuente de verdad) */
export const PERMISSIONS = {
  // Plataforma (system / superadmin)
  SYSTEM_COMPANIES_VIEW: "SYSTEM_COMPANIES_VIEW",
  SYSTEM_COMPANIES_MANAGE: "SYSTEM_COMPANIES_MANAGE",
  SYSTEM_ROLES_MANAGE: "SYSTEM_ROLES_MANAGE",

  // Negocio (tenant)
  USERS_VIEW: "USERS_VIEW",
  USERS_MANAGE: "USERS_MANAGE",
  ROLES_VIEW: "ROLES_VIEW",
  ROLES_MANAGE: "ROLES_MANAGE",

  DASHBOARD_VIEW: "DASHBOARD_VIEW",
  DASHBOARD_MANAGE: "DASHBOARD_MANAGE",

  COMPANIES_VIEW: "COMPANIES_VIEW",
  COMPANIES_MANAGE: "COMPANIES_MANAGE",

  SURVEY_VIEW: "SURVEY_VIEW",
  SURVEY_MANAGE: "SURVEY_MANAGE",

  BURNOUT_VIEW: "BURNOUT_VIEW",
  BURNOUT_MANAGE: "BURNOUT_MANAGE",

  TEAM_VIEW: "TEAM_VIEW",
  TEAM_MANAGE: "TEAM_MANAGE",
  // agrega aquí todo lo que vaya apareciendo
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 2) Catálogo de roles (única fuente de verdad) */
export const ROLES = {
  Administrador: {
    description:
      "Acceso completo a la compañía; puede gestionar empleados, métricas y configuración del tenant.",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.COMPANIES_VIEW,
      PERMISSIONS.COMPANIES_MANAGE,
      PERMISSIONS.BURNOUT_VIEW,
      PERMISSIONS.BURNOUT_MANAGE,
      // si también querés que sea “system” agrega los SYSTEM_*,
      // pero normalmente los SYSTEM_* resérvalos para un rol separado
    ],
  },

  Manager: {
    description:
      "Gestión de equipos y métricas; sin acceso a configuración global de la compañía.",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.BURNOUT_VIEW,
    ],
  },

  Analista: {
    description: "Lectura de datos y métricas.",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.BURNOUT_VIEW,
    ],
  },

  // Rol de plataforma (opcional si manejás un superadmin real de sistema)
  SystemAdmin: {
    description: "Gestión de la plataforma (multi-empresa, roles globales).",
    permissions: [
      PERMISSIONS.SYSTEM_COMPANIES_VIEW,
      PERMISSIONS.SYSTEM_COMPANIES_MANAGE,
      PERMISSIONS.SYSTEM_ROLES_MANAGE,
      // puedes sumar permisos de negocio si querés que también actúe dentro de tenants
    ],
  },

  Empleado: {
    description: "Empleado",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.BURNOUT_VIEW,
    ],
  },
} as const;

export type RoleName = keyof typeof ROLES; // "Administrador" | "Manager" | ...
