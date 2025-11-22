// app/api/users/route.ts (Actualización del POST)
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { PublicError } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Esquema de validación estricto en Backend
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().min(1),
  position: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  workMode: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN"]).optional(),
  seniority: z.enum(["JR", "SSR", "SR"]).optional(),
  managerId: z.string().optional().nullable(),
  capacityHoursPerWeek: z.number().optional(),
  // ... otros campos opcionales
});

export async function POST(req: Request) {
  const { companyId } = await requireCompanyScope();
  const body = await req.json();

  // 1. Validación de Tipos con Zod
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    throw new PublicError(validation.error.errors[0].message, 400);
  }
  const data = validation.data;

  // 2. Validar unicidad de email
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new PublicError("El email ya está registrado en el sistema.", 409);
  }

  // 3. Validar que el manager pertenezca a la empresa (Seguridad Multi-tenant)
  if (data.managerId) {
    const manager = await prisma.user.findFirst({
      where: { id: data.managerId, companyId },
    });
    if (!manager) throw new PublicError("El manager seleccionado no es válido.", 400);
  }

  // 4. Creación
  const passwordHash = await bcrypt.hash(data.password, 10);
  
  const newUser = await prisma.user.create({
    data: {
      companyId,
      email: data.email,
      password: passwordHash,
      name: data.name,
      roleId: data.roleId,
      position: data.position,
      department: data.department,
      phone: data.phone,
      workMode: data.workMode,
      employmentType: data.employmentType,
      seniority: data.seniority,
      managerId: data.managerId || null, // Asegurar null si viene string vacío
      capacityHoursPerWeek: data.capacityHoursPerWeek,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
}

// Mantén el GET existente, funciona correctamente para el listado.
export async function GET(req: Request) {
    // ... código existente del GET [cite: 618-628] ...
    // Asegúrate de mantener la lógica original del GET que ya estaba bien.
    const { companyId } = await requireCompanyScope();
    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get("take") ?? "10"), 50);
    const cursor = searchParams.get("cursor");
    // ... resto de la lógica de filtros ...
    const where: any = { companyId }; 
    // (Resumen para brevedad, mantener lógica original de filtros aquí)
    
    const employees = await prisma.user.findMany({
        where,
        take,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { role: true } // Incluir rol es útil para la UI
    });
    
    const total = await prisma.user.count({ where });
    return NextResponse.json({ employees, kpis: { total } }); // Simplificado
}