// app/(app)/surveys/my/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SurveyRunner from "@/components/app/surveys/SurveyRunner";

export default async function MySurveyRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  // Resuelve la promesa de params
  const { id } = await params;

  return <SurveyRunner campaignId={id} />;
}
