// app/(app)/dashboard/page.tsx
import { requireSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import DashboardView from "@/components/app/dashboard/DashboardView";

export default async function DashboardPage() {
  const { user } = await requireSession(); // ✅ garantiza user.id y companyId o lanza
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }, // ✅ id seguro
    include: { role: true },
  });

  // por si el usuario fue borrado entre medio:
  if (!dbUser) {
    // podría redirigir a logout o lanzar un 404 controlado
    throw new Error("Usuario no encontrado");
  }

  return (
    <DashboardView
      user={{
        id: dbUser.id,
        name: dbUser.name,
        companyId: dbUser.companyId,
        role: { name: dbUser.role.name },
      }}
    />
  );
}
