// app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { hasRole } from "@/lib/auth";
import { PublicError } from "@/lib/errors";
import bcrypt from "bcryptjs";

// GET: listar empleados (paginado lazy load)
export async function GET(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  // if (!hasRole(user, "Manager")) throw new PublicError("No autorizado", 403);

  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "10"), 50);
  const cursor = searchParams.get("cursor");
  const filters = {
    name: searchParams.get("name") ?? undefined,
    email: searchParams.get("email") ?? undefined,
    phone: searchParams.get("phone") ?? undefined,
  };

  const where: any = {
    companyId,
    ...(filters.name
      ? { name: { contains: filters.name, mode: "insensitive" } }
      : {}),
    ...(filters.email
      ? { email: { contains: filters.email, mode: "insensitive" } }
      : {}),
    ...(filters.phone
      ? { phone: { contains: filters.phone, mode: "insensitive" } }
      : {}),
  };

  const employees = await prisma.user.findMany({
    where,
    take,
    skip: cursor ? 1 : 0,
    ...(cursor ? { cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      image: true,
      phone: true,
      department: true,
      workMode: true,
      status: true,
      createdAt: true,
    },
  });

  const nextCursor =
    employees.length === take ? employees[employees.length - 1].id : null;
  const total = await prisma.user.count({ where });

  const kpis = {
    total,
    activos: await prisma.user.count({ where: { ...where, status: "ACTIVE" } }),
    inactivos: await prisma.user.count({
      where: { ...where, status: "INACTIVE" },
    }),
    remotos: await prisma.user.count({
      where: { ...where, workMode: "REMOTE" },
    }),
  };

  return NextResponse.json({ employees, nextCursor, kpis });
}

// POST: crear empleado (dentro del tenant del Manager)
export async function POST(req: Request) {
  const { user, companyId } = await requireCompanyScope();
  // if (!hasRole(user, "Manager")) throw new PublicError("No autorizado", 403);

  const body = await req.json();

  if (!body?.email || !body?.name || !body?.password || !body?.roleId) {
    throw new PublicError("Datos incompletos", 422);
  }

  const passwordHash = await bcrypt.hash(String(body.password), 10);

  const created = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: passwordHash,
      companyId, // siempre del Manager
      roleId: body.roleId, // según tu ejemplo
      position: body.position ?? null,
      phone: body.phone ?? null,
      image: body.image ?? null,
      department: body.department ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({ created }, { status: 201 });
}
