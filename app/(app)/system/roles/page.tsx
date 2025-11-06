import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SystemRolesClient from "./SystemRolesClient";
import { PERMISSIONS } from "@/config/roles";

export default async function SystemRolesPage() {
  const session = await getServerSession(authOptions);
  const canManage = !!session?.user?.role?.permissions?.includes(
    PERMISSIONS.SYSTEM_ROLES_MANAGE
  );

  if (!session || !canManage) redirect("/auth/login"); // o muestra 403 si preferís

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear nuevo rol</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemRolesClient />
        </CardContent>
      </Card>

      {/* La tabla está dentro del client para poder refrescarla localmente */}
    </div>
  );
}
