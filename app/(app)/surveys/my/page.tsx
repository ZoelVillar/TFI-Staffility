// app/(app)/surveys/my/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import MySurveysView from "@/components/app/surveys/MySurveysView";

export default async function MySurveysPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  return <MySurveysView />;
}
