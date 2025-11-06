// src/app/api/register-company/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma";
import prisma from "@/lib/prisma";

// Definimos el tipo para los datos que esperamos del formulario
interface CompanyRegistrationData {
  companyName: string;
  numEmployees: number; // Ya lo convertimos a number en el frontend
  contactEmail: string;
  contactName: string;
  phone?: string; // Opcional
  industry: string; // Fijo en "IT Software Development"
}

export async function POST(req: Request) {
  try {
    const body: CompanyRegistrationData = await req.json();

    const {
      companyName,
      numEmployees,
      contactEmail,
      contactName,
      phone,
      industry,
    } = body;

    // Validación básica
    if (
      !companyName ||
      !numEmployees ||
      !contactEmail ||
      !contactName ||
      !industry
    ) {
      return NextResponse.json(
        { message: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    // Validación de email básico
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { message: "Formato de email inválido." },
        { status: 400 }
      );
    }

    // Verificar si la empresa ya existe (por nombre o email de contacto)
    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { companyName: { equals: companyName, mode: "insensitive" } }, // 'insensitive' para evitar duplicados por mayúsculas/minúsculas
          { contactEmail: { equals: contactEmail, mode: "insensitive" } },
        ],
      },
    });

    if (existingCompany) {
      return NextResponse.json(
        { message: "Una empresa con este nombre o email ya está registrada." },
        { status: 409 }
      ); // 409 Conflict
    }

    // Crear la empresa en la base de datos
    const newCompany = await prisma.company.create({
      data: {
        companyName,
        numEmployees,
        contactEmail,
        contactName,
        phone,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Empresa registrada con éxito.", company: newCompany },
      { status: 201 }
    ); // 201 Created
  } catch (error) {
    console.error("Error al registrar la empresa:", error);
    return NextResponse.json(
      { message: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
