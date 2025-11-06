// prisma/seed.ts
import {
  PrismaClient,
  EmploymentStatus,
  EmploymentType,
  WorkMode,
} from "../lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// IDs de roles provistos
const EMPLOYEE_ROLE_ID = "cmhmliwuw0004tn6oite7nd3t"; // Empleado
const ADMIN_ROLE_ID = "cmhmliwqh0000tn6o1uh47805"; // Administrador

// Config empresa demo
const COMPANY_NAME = process.env.SEED_COMPANY_NAME || "Acme Labs SA";
const CONTACT_NAME = process.env.SEED_CONTACT_NAME || "María Acme";
const CONTACT_EMAIL =
  process.env.SEED_CONTACT_EMAIL || "contacto@acmelabs.example";
const COMPANY_PHONE = process.env.SEED_COMPANY_PHONE || "+54 11 5555-0000";

// Passwords demo (cámbialos luego)
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@acmelabs.example";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
const EMP_PASSWORD = process.env.SEED_EMP_PASSWORD || "Empleado123!";

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function ensureCompany() {
  const company = await prisma.company.upsert({
    where: { companyName: COMPANY_NAME },
    create: {
      companyName: COMPANY_NAME,
      numEmployees: 11, // 10 empleados + 1 admin
      contactEmail: CONTACT_EMAIL,
      contactName: CONTACT_NAME,
      phone: COMPANY_PHONE,
      active: true,
    },
    update: {
      contactEmail: CONTACT_EMAIL,
      contactName: CONTACT_NAME,
      phone: COMPANY_PHONE,
      active: true,
    },
  });
  console.log(`🏢 Empresa OK: ${company.companyName}`);
  return company;
}

async function ensureRoleById(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role)
    throw new Error(
      `No existe Role con id=${roleId}. Verifica tus roles seed.`
    );
  return role;
}

async function createOrUpdateAdmin(companyId: string) {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Aseguramos que el rol administrador exista
  await ensureRoleById(ADMIN_ROLE_ID);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin Acme",
      password: adminHash,
      image: null,
      companyId,
      roleId: ADMIN_ROLE_ID,

      // Datos de empleado del admin
      position: "Administrador",
      department: "Dirección",
      phone: "+54 11 5555-0001",
      workEmail: ADMIN_EMAIL,
      workMode: WorkMode.HYBRID,
      locationCity: "Buenos Aires",
      locationCountry: "Argentina",
      startDate: new Date("2023-01-10"),
      status: EmploymentStatus.ACTIVE,
      employmentType: EmploymentType.FULL_TIME,
      salary: "1500000.00",
      tags: ["admin", "management"],
      notes: "Usuario administrador de la compañía demo.",
      documentId: "ACME-ADM-0001",
      birthday: new Date("1990-05-15"),
    },
    update: {
      roleId: ADMIN_ROLE_ID,
      companyId,
      position: "Administrador",
      department: "Dirección",
      status: EmploymentStatus.ACTIVE,
    },
    select: { id: true, email: true, name: true },
  });

  console.log(`🛡️  Admin OK: ${admin.email}`);
  return admin;
}

async function createEmployees(companyId: string, managerId: string) {
  // Aseguramos que el rol empleado exista
  await ensureRoleById(EMPLOYEE_ROLE_ID);

  const empHash = await bcrypt.hash(EMP_PASSWORD, 10);
  const firstNames = [
    "Juan",
    "Ana",
    "Luis",
    "Carla",
    "Sofía",
    "Pedro",
    "Lucía",
    "Martín",
    "Valentina",
    "Nicolás",
    "Agustina",
    "Mauro",
  ];
  const lastNames = [
    "Pérez",
    "Gómez",
    "Rodríguez",
    "Fernández",
    "Sánchez",
    "López",
    "Martínez",
    "Díaz",
    "Acosta",
    "Torres",
    "Silva",
    "Romero",
  ];
  const positions = [
    "Dev Frontend",
    "Dev Backend",
    "QA Analyst",
    "UX Designer",
    "Data Analyst",
    "DevOps",
    "Soporte",
    "Scrum Master",
    "Product Analyst",
    "HR Analyst",
  ];
  const departments = [
    "IT",
    "Producto",
    "Calidad",
    "Datos",
    "Operaciones",
    "Soporte",
    "RRHH",
    "UX/UI",
  ];
  const workModes = [WorkMode.REMOTE, WorkMode.HYBRID, WorkMode.ONSITE];
  const countries = ["Argentina", "Chile", "Uruguay"];
  const cities = ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata"];

  // Crea 10 empleados determinísticos por email para idempotencia
  for (let i = 1; i <= 10; i++) {
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const name = `${fn} ${ln}`;
    const email = `empleado${i}@acmelabs.example`;
    const workEmail = `empleado${i}@acme.local`;
    const phone = `+54 11 5555-00${(10 + i).toString().slice(-2)}`;
    const position = positions[(i - 1) % positions.length];
    const department = departments[(i - 1) % departments.length];
    const status =
      i % 8 === 0 ? EmploymentStatus.ON_LEAVE : EmploymentStatus.ACTIVE;
    const employmentType = [
      EmploymentType.FULL_TIME,
      EmploymentType.PART_TIME,
      EmploymentType.CONTRACTOR,
      EmploymentType.INTERN,
    ][i % 4];
    const workMode = workModes[i % workModes.length];
    const city = cities[i % cities.length];
    const country = countries[i % countries.length];
    const salary = (500000 + i * 25000).toFixed(2); // string para Decimal
    const docId = `ACME-EMP-${String(i).padStart(4, "0")}`;
    const birthday = new Date(1990 + (i % 10), i % 12, (i % 28) + 1);
    const startDate = new Date(2024, i % 12, (i % 28) + 1);

    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        password: empHash,
        image: null,
        companyId,
        roleId: EMPLOYEE_ROLE_ID,

        position,
        department,
        phone,
        workEmail,
        workMode,
        locationCity: city,
        locationCountry: country,
        managerId,
        startDate,
        status,
        employmentType,
        salary,
        tags: ["demo", department.toLowerCase()],
        notes: `Empleado demo #${i} - generado por seed`,
        documentId: docId,
        birthday,
      },
      update: {
        roleId: EMPLOYEE_ROLE_ID,
        companyId,
        position,
        department,
        phone,
        workEmail,
        workMode,
        locationCity: city,
        locationCountry: country,
        managerId,
        status,
        employmentType,
        salary,
        documentId: docId,
      },
    });
  }

  console.log("👥  10 empleados OK (rol Empleado)");
}

async function main() {
  // Empresa
  const company = await ensureCompany();

  // Admin
  const admin = await createOrUpdateAdmin(company.id);

  // Empleados
  await createEmployees(company.id, admin.id);

  console.log("✅ Seed de empresa + 10 empleados + admin completado.");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
