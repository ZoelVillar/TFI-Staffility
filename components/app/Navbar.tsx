// src/components/app/Navbar.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NAV_GROUPS } from "./nav-config";
import { hasPermission, hasAnyPermission } from "@/lib/auth";
import { Building2, Shield, Users } from "lucide-react";
import NavGroupsAccordion from "./NavGroupsAccordion";

// Mapeo simple de íconos por grupo (sin tocar tu config)
const GROUP_ICONS: Record<string, React.ReactNode> = {
  Usuarios: <Users className="h-4 w-4" />,
  Roles: <Shield className="h-4 w-4" />,
  Sistema: <Building2 className="h-4 w-4" />,
};

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? null;

  // Pre-procesamos grupos e items permitidos en el SERVER (como antes)
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
    <nav className="w-full bg-white border-b/0 shadow-sm">
      <div className="container mx-auto flex items-center gap-6 py-3 px-4">
        <Link
          href="/dashboard"
          className="font-semibold text-lg tracking-tight hover:opacity-90 transition"
        >
          Staffility
        </Link>

        {/* Acordeón controlado: solo uno abierto a la vez */}
        <div className="hidden md:flex items-center gap-2">
          <NavGroupsAccordion groups={allowedGroups} />
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {user?.company?.companyName ?? "Sin Empresa"}
          </span>
          <span className="text-xs rounded-full bg-gray-100 px-2 py-1">
            {user?.role?.name ?? "Sin Rol"}
          </span>
          <Link
            href="/api/auth/signout"
            className="text-sm inline-flex items-center rounded-full border px-3 py-1.5 hover:bg-gray-50 transition"
            prefetch={false}
          >
            Cerrar sesión
          </Link>
        </div>
      </div>
    </nav>
  );
}
