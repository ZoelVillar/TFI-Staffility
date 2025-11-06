// app/(app)/surveys/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SurveysView from "@/components/app/surveys/SurveysView";

export default async function SurveysPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  return <SurveysView />;
}
