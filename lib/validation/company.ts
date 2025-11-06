// src/lib/validation/company.ts
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const companyCreateSchema = z.object({
  companyName: z.string().min(2, "Nombre demasiado corto"),
  numEmployees: z
    .number({ error: "Cantidad inválida" })
    .int()
    .min(1, "Debe ser al menos 1"),
  contactEmail: z.string().email("Email inválido"),
  contactName: z.string().min(2, "Nombre de contacto inválido"),
  phone: z.string().optional(),
});

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;

export async function getCompaniesAndMetrics(userId: string) {
  const companies = await prisma.company.findMany({
    where: {
      /* según userId/tenant si aplica */
    },
    include: { _count: { select: { users: true } } },
  });
  const metrics = {
    total: companies.length,
    active: companies.filter((c) => c.active).length,
    inactive: companies.filter((c) => !c.active).length,
    totalUsers: companies.reduce((acc, c) => acc + c._count.users, 0),
  };
  return { companies, metrics };
}
