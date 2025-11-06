// app/(app)/employees/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/auth";
import EmployeesView from "@/components/app/employees/EmployeesView";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  // if (!hasRole(session.user as any, "Manager")) redirect("/");

  return <EmployeesView />;
}
