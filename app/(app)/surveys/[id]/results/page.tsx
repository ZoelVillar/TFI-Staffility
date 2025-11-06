// app/(app)/surveys/[id]/results/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CampaignResultsView from "@/components/app/surveys/CampaignResultsView";

export default async function CampaignResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  // Resuelve la promesa de params
  const { id } = await params;

  return <CampaignResultsView campaignId={id} />;
}
