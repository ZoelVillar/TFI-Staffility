// app/(app)/team/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import TeamView from "@/components/app/team/TeamView";

export default async function MyTeamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  return <TeamView />;
}
