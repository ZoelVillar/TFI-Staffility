// app/(app)/team/[id]/workload/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import TeamWorkloadView from "@/components/app/work/TeamWorkloadView";

type Props = { params: Promise<{ id: string }> };

export default async function TeamWorkloadPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  // Resuelve la promesa de params
  const { id } = await params;

  // Podrías chequear permisos aquí si querés bloquear a no-managers:
  // if (!hasAnyPermission(session.user, [PERMISSIONS.USERS_VIEW])) redirect("/");

  return <TeamWorkloadView teamId={id} />;
}
