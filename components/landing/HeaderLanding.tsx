// src/components/landing/HeaderLanding.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Componente Button de Shadcn/ui

export function HeaderLanding() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white text-foreground shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo o Nombre de la empresa */}
        <Link href="/" className="text-2xl font-bold text-primary">
          Staffility
        </Link>

        {/* Navegación para desktop */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="#inicio"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Inicio
          </Link>
          <Link
            href="#caracteristicas"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Características
          </Link>
          <Link
            href="#beneficios"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Beneficios
          </Link>
          <Link
            href="#contacto"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Contacto
          </Link>
        </nav>

        {/* Botón de Acceder */}
        <Button asChild>
          <Link href="/auth/login">Acceder</Link>
        </Button>

        {/* Menú hamburguesa para mobile (placeholder, lo implementaremos si lo pides) */}
        <div className="md:hidden">
          {/* Aquí irá un botón para abrir un menú mobile, por ahora lo dejamos simple */}
          <Button variant="ghost" size="icon">
            {/* Puedes usar un icono de hamburguesa aquí, por ejemplo de lucide-react */}
            ☰
          </Button>
        </div>
      </div>
    </header>
  );
}
