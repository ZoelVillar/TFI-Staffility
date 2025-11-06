import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import TeamDetailView from "@/components/app/team/TeamDetailView";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  // Resuelve la promesa de params
  const { id } = await params;

  console.log("Rendering TeamDetailPage for team ID:", id);
  return <TeamDetailView teamId={id} />;
}
