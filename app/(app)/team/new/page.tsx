// app/(app)/team/new/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { hasAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreateTeamForm from "@/components/app/team/CreateTeamForm";

export default async function CreateTeamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  // Protección de Ruta Server-Side
  if (!hasAnyPermission(session.user, [PERMISSIONS.TEAM_MANAGE, PERMISSIONS.SYSTEM_COMPANIES_MANAGE])) {
    redirect("/team?error=Unauthorized");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nuevo Equipo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTeamForm />
        </CardContent>
      </Card>
    </div>
  );
}