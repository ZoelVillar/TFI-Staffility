import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CompanyForm from "@/components/app/companies/CompanyForm";
import ActivateButton from "@/components/app/companies/ActivateButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scopeByCompany } from "@/lib/tenant";
import prisma from "@/lib/prisma";

type CompanyDTO = {
  id: string;
  companyName: string;
  active: boolean;
  numEmployees: number;
  contactEmail: string;
  contactName: string;
  phone?: string | null;
  createdAt: string;
  _count: { users: number };
};

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const user = session.user as any;
  const where = scopeByCompany(
    user,
    user.companyId ?? null,
    {},
    { allowSystemWide: true }
  );

  const companies = await prisma.company.findMany({
    where,
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  });

  const metrics = {
    total: companies.length,
    active: companies.filter((c) => c.active).length,
    inactive: companies.filter((c) => !c.active).length,
    totalUsers: companies.reduce((a, c) => a + c._count.users, 0),
  };

  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard title="Total empresas" value={metrics.total} />
        <MetricCard title="Activas" value={metrics.active} />
        <MetricCard title="Inactivas" value={metrics.inactive} />
        <MetricCard title="Usuarios totales" value={metrics.totalUsers} />
      </div>

      {/* Crear empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyForm />
        </CardContent>
      </Card>

      {/* Listado */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th>Nombre</th>
                  <th>Activa</th>
                  <th># Empleados</th>
                  <th>Usuarios</th>
                  <th>Contacto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td>{c.companyName}</td>
                    <td>{c.active ? "Sí" : "No"}</td>
                    <td>{c.numEmployees}</td>
                    <td>{c._count.users}</td>
                    <td>
                      <div className="flex flex-col">
                        <span>{c.contactName}</span>
                        <span className="text-muted-foreground">
                          {c.contactEmail}
                        </span>
                        {c.phone && (
                          <span className="text-muted-foreground">
                            {c.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <ActivateButton id={c.id} active={c.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
