// app/(app)/employees/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { scopeByCompany } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmployeeForm from "@/components/app/employees/EmployeeForm";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const user = session.user as any;
  const where = scopeByCompany(user, user.companyId ?? null, {});
  const employees = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      department: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-muted/30">
                  <th className="py-2 px-2">Nombre</th>
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2">Puesto</th>
                  <th className="py-2 px-2">Departamento</th>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Creado</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="py-2 px-2">{e.name ?? "—"}</td>
                    <td className="py-2 px-2">{e.email}</td>
                    <td className="py-2 px-2">{e.position ?? "—"}</td>
                    <td className="py-2 px-2">{e.department ?? "—"}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border
                        ${
                          e.status === "ACTIVE"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : e.status === "ON_LEAVE"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-rose-50 border-rose-200 text-rose-700"
                        }`}
                      >
                        {e.status === "ACTIVE"
                          ? "Activo"
                          : e.status === "ON_LEAVE"
                          ? "Licencia"
                          : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No hay empleados cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
