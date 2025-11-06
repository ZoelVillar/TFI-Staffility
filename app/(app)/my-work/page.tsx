// app/(app)/my-work/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import MyWorkView from "@/components/app/work/MyWorkView";

export default async function MyWorkPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  const userId = (session.user as any)?.id;
  const companyId = (session.user as any)?.companyId;

  // Traemos lo necesario para capacidad y heurísticas
  const me = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      employmentType: true,
      seniority: true,
      capacityHoursPerWeek: true,
      capacitySpPerWeek: true,
      hoursPerStoryPoint: true,
    },
  });

  if (!me) redirect("/auth/login");

  return <MyWorkView initialUser={me} />;
}
