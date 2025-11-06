// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth"; // Para obtener la sesión en el servidor
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Importa tus opciones de auth
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react"; // Para cerrar sesión en el cliente
import SignOutButton from "@/components/SignOutButton"; // Un componente Client para cerrar sesión

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Si no hay sesión, redirigimos al login
    redirect("/auth/login");
  }

  // La sesión ahora contiene la información del usuario, incluido el rol y la empresa
  const user = session.user;
  const roleName = user?.role?.name ?? "Sin Rol";
  const companyName = user?.company?.companyName ?? "Sin Empresa";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] p-4">
      <h1 className="text-4xl font-bold text-primary mb-6">
        Bienvenido, {user?.name || user?.email}!
      </h1>
      <p className="text-lg text-muted-foreground mb-4">
        Has accedido como{" "}
        <span className="font-semibold text-foreground">{roleName}</span> para
        la empresa{" "}
        <span className="font-semibold text-foreground">{companyName}</span>.
      </p>
      <p className="text-muted-foreground mb-8">
        Este es tu dashboard principal. Aquí verás las métricas de bienestar y
        productividad.
      </p>
      <SignOutButton /> {/* Botón para cerrar sesión */}
      <div className="mt-10 p-4 border rounded-md bg-card">
        <h2 className="text-xl font-semibold mb-2">Detalles de la sesión:</h2>
        <pre className="text-sm overflow-x-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}
