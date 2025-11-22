// components/app/Navbar.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NAV_GROUPS } from "./nav-config";
import { hasPermission, hasAnyPermission } from "@/lib/auth";
import { Building2, Shield, Users, BarChart3, LayoutDashboard } from "lucide-react";
import NavGroupsAccordion from "./NavGroupsAccordion";
import { UserNav } from "./UserNav"; // <--- Importamos el nuevo componente

// Mapeo de íconos mejorado
const GROUP_ICONS: Record<string, React.ReactNode> = {
  "Usuarios": <Users className="h-4 w-4" />,
  "Roles": <Shield className="h-4 w-4" />,
  "Sistema": <Building2 className="h-4 w-4" />,
  "Encuestas": <BarChart3 className="h-4 w-4" />,
  "Carga de trabajo": <LayoutDashboard className="h-4 w-4" />
};

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? null;

  // Lógica de filtrado de grupos (se mantiene igual, es sólida)
  const allowedGroups = NAV_GROUPS.map((group) => {
    const groupPerms = group.items
      .map((i) => i.requiredPerm)
      .filter(Boolean) as string[];

    if (!hasAnyPermission(user, groupPerms)) return null;

    const items = group.items
      .filter(
        (item) => !item.requiredPerm || hasPermission(user, item.requiredPerm)
      )
      .map((item) => ({ label: item.label, href: item.href }));

    if (items.length === 0) return null;

    return {
      label: group.label,
      icon: GROUP_ICONS[group.label] ?? null,
      items,
    };
  }).filter(Boolean) as {
    label: string;
    icon?: React.ReactNode;
    items: { label: string; href: string }[];
  }[];

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary hover:opacity-90 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              S
            </div>
            <span>Staffility</span>
          </Link>

          {/* Navegación Principal (Desktop) */}
          <div className="hidden md:flex items-center gap-1">
            <NavGroupsAccordion groups={allowedGroups} />
          </div>
        </div>

        {/* Área de Usuario (Derecha) */}
        <div className="flex items-center gap-4">
          {user ? (
            <UserNav 
              user={{
                name: user.name,
                email: user.email,
                image: user.image,
                roleName: user.role?.name,
                companyName: (user as any).companyId // Idealmente traer el nombre de la empresa en la sesión
                  ? "Mi Empresa" // Fallback visual si no tenemos el nombre en session
                  : "Sin Empresa"
              }} 
            />
          ) : (
             <Link href="/auth/login" className="text-sm font-medium hover:underline">
               Iniciar Sesión
             </Link>
          )}
        </div>
      </div>
    </nav>
  );
}