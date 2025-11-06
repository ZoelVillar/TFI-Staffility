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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Nombre</th>
                <th>Email</th>
                <th>Puesto</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td>{e.position}</td>
                  {/* <td>{e.active ? "Sí" : "No"}</td> */}
                  <td>{/* luego botones de editar/eliminar */}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
