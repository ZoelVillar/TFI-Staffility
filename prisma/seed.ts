// prisma/seed.ts
import { PrismaClient } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** ======== CONFIG ======== */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@staffility.io";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const EMPLOYEE_PASSWORD = process.env.SEED_EMP_PASSWORD ?? "Empleado123!";

const SYSTEM_COMPANY_NAME =
  process.env.SEED_SYSTEM_COMPANY_NAME ?? "Staffility (System)";

// Catálogo de permisos (tu lista)
const PERMISSIONS = {
  SYSTEM_COMPANIES_VIEW: "SYSTEM_COMPANIES_VIEW",
  SYSTEM_COMPANIES_MANAGE: "SYSTEM_COMPANIES_MANAGE",
  SYSTEM_ROLES_MANAGE: "SYSTEM_ROLES_MANAGE",

  USERS_VIEW: "USERS_VIEW",
  USERS_MANAGE: "USERS_MANAGE",
  ROLES_VIEW: "ROLES_VIEW",
  ROLES_MANAGE: "ROLES_MANAGE",

  DASHBOARD_VIEW: "DASHBOARD_VIEW",
  DASHBOARD_MANAGE: "DASHBOARD_MANAGE",

  COMPANIES_VIEW: "COMPANIES_VIEW",
  COMPANIES_MANAGE: "COMPANIES_MANAGE",

  BURNOUT_VIEW: "BURNOUT_VIEW",
  BURNOUT_MANAGE: "BURNOUT_MANAGE",

  TEAM_VIEW: "TEAM_VIEW",
  TEAM_MANAGE: "TEAM_MANAGE",
} as const;

// Definición de roles (idempotente via upsert)
const ROLES: Record<string, { description?: string; permissions: string[] }> = {
  SystemAdmin: {
    description: "Gestión global de la plataforma",
    permissions: [
      PERMISSIONS.SYSTEM_COMPANIES_VIEW,
      PERMISSIONS.SYSTEM_COMPANIES_MANAGE,
      PERMISSIONS.SYSTEM_ROLES_MANAGE,

      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.TEAM_VIEW,
      PERMISSIONS.COMPANIES_VIEW,
      PERMISSIONS.BURNOUT_VIEW,
      // puede o no tener los *_MANAGE de negocio; lo dejamos sólo con system manage
    ],
  },
  Administrador: {
    description: "Admin del tenant: gestión completa de la empresa",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_MANAGE,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.TEAM_VIEW,
      PERMISSIONS.TEAM_MANAGE,
      PERMISSIONS.COMPANIES_VIEW,
      PERMISSIONS.COMPANIES_MANAGE,
      PERMISSIONS.BURNOUT_VIEW,
      PERMISSIONS.BURNOUT_MANAGE,
    ],
  },
  Manager: {
    description: "Gestión de equipo y personas",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.TEAM_VIEW,
      PERMISSIONS.TEAM_MANAGE,
      PERMISSIONS.BURNOUT_VIEW,
    ],
  },
  Analista: {
    description: "Lectura de datos y métricas",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.TEAM_VIEW,
      PERMISSIONS.BURNOUT_VIEW,
    ],
  },
  Empleado: {
    description: "Usuario final",
    permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.TEAM_VIEW],
  },
};

/** ======== HELPERS ======== */

async function upsertRoles() {
  for (const [name, def] of Object.entries(ROLES)) {
    await prisma.role.upsert({
      where: { name },
      create: {
        name,
        description: def.description ?? null,
        permissions: def.permissions,
      },
      update: {
        description: def.description ?? null,
        permissions: def.permissions,
      },
    });
  }
  console.log("✅ Roles sincronizados");
}

async function ensureSystemCompany() {
  const company = await prisma.company.upsert({
    where: { companyName: SYSTEM_COMPANY_NAME },
    create: {
      companyName: SYSTEM_COMPANY_NAME,
      numEmployees: 0,
      contactEmail: "system@staffility.local",
      contactName: "System",
      phone: null,
      active: true,
    },
    update: {},
  });
  console.log(`✅ Empresa de sistema: ${company.companyName}`);
  return company;
}

async function ensureSystemAdmin(systemCompanyId: string) {
  const sysRole = await prisma.role.findUnique({
    where: { name: "SystemAdmin" },
  });
  if (!sysRole) throw new Error("Falta rol SystemAdmin");

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "System Admin",
      image: null,
      password: hash,
      companyId: systemCompanyId,
      roleId: sysRole.id,
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      workMode: "REMOTE",
      position: "Platform Admin",
      department: "Platform",
    },
    update: {
      companyId: systemCompanyId,
      roleId: sysRole.id,
    },
  });

  console.log(`✅ System Admin: ${user.email}`);
  return user;
}

type NewUserInput = {
  email: string;
  name: string;
  roleName: string;
  position?: string | null;
  department?: string | null;
  seniority?: "JR" | "SSR" | "SR" | null;
  workMode?: "ONSITE" | "HYBRID" | "REMOTE" | null;
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  managerEmail?: string | null; // para setear managerId después
};

async function createCompanyWithPeople(input: {
  companyName: string;
  contactEmail: string;
  contactName: string;
  phone?: string | null;
  active?: boolean;
  users: NewUserInput[];
  teams: Array<{
    name: string;
    description?: string | null;
    leadEmail?: string | null;
    members: Array<{ email: string; roleInTeam?: "LEAD" | "MEMBER" }>;
  }>;
}) {
  const company = await prisma.company.upsert({
    where: { companyName: input.companyName },
    create: {
      companyName: input.companyName,
      numEmployees: input.users.length,
      contactEmail: input.contactEmail,
      contactName: input.contactName,
      phone: input.phone ?? null,
      active: input.active ?? true,
    },
    update: {
      numEmployees: input.users.length,
      contactEmail: input.contactEmail,
      contactName: input.contactName,
      phone: input.phone ?? null,
      active: input.active ?? true,
    },
  });

  // cache roles
  const roles = await prisma.role.findMany();
  const roleByName = new Map(roles.map((r) => [r.name, r]));

  // 1) Crear/actualizar usuarios (sin managerId todavía)
  const createdUsers: Record<string, string> = {}; // email -> id
  for (const u of input.users) {
    const role = roleByName.get(u.roleName);
    if (!role) throw new Error(`Rol inexistente: ${u.roleName}`);

    const hash = await bcrypt.hash(EMPLOYEE_PASSWORD, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        image: null,
        password: hash,
        companyId: company.id,
        roleId: role.id,
        position: u.position ?? null,
        department: u.department ?? null,
        seniority: (u.seniority as any) ?? null,
        workMode: (u.workMode as any) ?? "HYBRID",
        status: (u.status as any) ?? "ACTIVE",
        employmentType: "FULL_TIME",
      },
      update: {
        companyId: company.id,
        roleId: role.id,
        position: u.position ?? null,
        department: u.department ?? null,
        seniority: (u.seniority as any) ?? null,
        workMode: (u.workMode as any) ?? "HYBRID",
        status: (u.status as any) ?? "ACTIVE",
        employmentType: "FULL_TIME",
      },
    });
    createdUsers[u.email] = user.id;
  }

  // 2) Setear managerId según managerEmail
  for (const u of input.users) {
    if (!u.managerEmail) continue;
    const meId = createdUsers[u.email];
    const mgrId = createdUsers[u.managerEmail];
    if (!meId || !mgrId) continue;
    await prisma.user.update({
      where: { id: meId },
      data: { managerId: mgrId },
    });
  }

  // 3) Crear/actualizar equipos y membresías
  for (const t of input.teams) {
    const leadId = t.leadEmail ? createdUsers[t.leadEmail] : undefined;

    const team = await prisma.team.upsert({
      where: { companyId_name: { companyId: company.id, name: t.name } },
      create: {
        companyId: company.id,
        name: t.name,
        description: t.description ?? null,
        leadId: leadId ?? null,
      },
      update: {
        description: t.description ?? null,
        leadId: leadId ?? null,
      },
    });

    // Limpiamos membresías duplicadas por si corremos varias veces
    for (const m of t.members) {
      const uid = createdUsers[m.email];
      if (!uid) continue;
      await prisma.teamMembership.upsert({
        where: { teamId_userId: { teamId: team.id, userId: uid } },
        create: {
          teamId: team.id,
          userId: uid,
          roleInTeam: (m.roleInTeam as any) ?? "MEMBER",
        },
        update: {
          roleInTeam: (m.roleInTeam as any) ?? "MEMBER",
        },
      });
    }
  }

  console.log(`✅ Company lista: ${company.companyName}`);
  return company;
}

/** ======== MAIN ======== */
async function main() {
  await upsertRoles();

  // Empresa de sistema y admin
  const sysCompany = await ensureSystemCompany();
  await ensureSystemAdmin(sysCompany.id);

  // Empresa 1
  await createCompanyWithPeople({
    companyName: "DevSoft",
    contactEmail: "contacto@devsoft.com",
    contactName: "Carla Dev",
    phone: "+54 11 5555-1111",
    users: [
      {
        email: "juan@devsoft.com",
        name: "Juan Martínez",
        roleName: "Manager",
        position: "Engineering Manager",
        department: "Engineering",
        seniority: "SR",
        workMode: "HYBRID",
      },
      {
        email: "zoel@devsoft.com",
        name: "Zoel Villar",
        roleName: "Empleado",
        position: "Desarrollador",
        department: "Frontend",
        seniority: "SSR",
        managerEmail: "juan@devsoft.com",
        workMode: "REMOTE",
      },
      {
        email: "lucia@devsoft.com",
        name: "Lucía Pérez",
        roleName: "Empleado",
        position: "Desarrolladora",
        department: "Frontend",
        seniority: "SSR",
        managerEmail: "juan@devsoft.com",
      },
      {
        email: "matias@devsoft.com",
        name: "Matías Rojas",
        roleName: "Analista",
        position: "QA Analyst",
        department: "QA",
        seniority: "JR",
        managerEmail: "juan@devsoft.com",
      },
      {
        email: "paula@devsoft.com",
        name: "Paula González",
        roleName: "Empleado",
        position: "PM",
        department: "Product",
        seniority: "SR",
        managerEmail: "juan@devsoft.com",
        workMode: "ONSITE",
      },
      {
        email: "admin@devsoft.com",
        name: "Admin DevSoft",
        roleName: "Administrador",
        position: "IT Admin",
        department: "IT",
      },
    ],
    teams: [
      {
        name: "Frontend",
        description: "Squad Frontend",
        leadEmail: "juan@devsoft.com",
        members: [
          { email: "juan@devsoft.com", roleInTeam: "LEAD" },
          { email: "zoel@devsoft.com" },
          { email: "lucia@devsoft.com" },
        ],
      },
      {
        name: "QA & Product",
        description: "Calidad y Producto",
        leadEmail: "paula@devsoft.com",
        members: [
          { email: "paula@devsoft.com", roleInTeam: "LEAD" },
          { email: "matias@devsoft.com" },
        ],
      },
    ],
  });

  // Empresa 2
  await createCompanyWithPeople({
    companyName: "TechHouse",
    contactEmail: "hello@techhouse.com",
    contactName: "Diego Tech",
    phone: "+54 11 5555-2222",
    users: [
      {
        email: "mariana@techhouse.com",
        name: "Mariana Suárez",
        roleName: "Manager",
        position: "Engineering Manager",
        department: "Engineering",
        seniority: "SR",
        workMode: "HYBRID",
      },
      {
        email: "roberto@techhouse.com",
        name: "Roberto Díaz",
        roleName: "Empleado",
        position: "Backend Dev",
        department: "Backend",
        seniority: "SSR",
        managerEmail: "mariana@techhouse.com",
      },
      {
        email: "ana@techhouse.com",
        name: "Ana Torres",
        roleName: "Analista",
        position: "Data Analyst",
        department: "Data",
        seniority: "JR",
        managerEmail: "mariana@techhouse.com",
      },
      {
        email: "eva@techhouse.com",
        name: "Eva Gómez",
        roleName: "Empleado",
        position: "UX Designer",
        department: "Design",
        seniority: "SR",
        managerEmail: "mariana@techhouse.com",
        workMode: "REMOTE",
      },
      {
        email: "admin@techhouse.com",
        name: "Admin TechHouse",
        roleName: "Administrador",
        position: "IT Admin",
        department: "IT",
      },
    ],
    teams: [
      {
        name: "Platform",
        description: "Infra & Backend",
        leadEmail: "mariana@techhouse.com",
        members: [
          { email: "mariana@techhouse.com", roleInTeam: "LEAD" },
          { email: "roberto@techhouse.com" },
          { email: "ana@techhouse.com" },
        ],
      },
      {
        name: "Design",
        description: "Diseño y UX",
        leadEmail: "eva@techhouse.com",
        members: [{ email: "eva@techhouse.com", roleInTeam: "LEAD" }],
      },
    ],
  });

  console.log("🎉 Seed completa OK");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
