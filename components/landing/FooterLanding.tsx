// src/components/landing/FooterLanding.tsx
import Link from "next/link";

export function FooterLanding() {
  return (
    <footer className="w-full bg-white text-foreground border-t border-gray-100 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <div className="mb-4 md:mb-0 text-center md:text-left">
          <Link href="/" className="text-lg font-bold text-primary">
            Staffility
          </Link>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} Staffility. Todos los derechos
            reservados.
          </p>
          <p>Mejorando el bienestar organizacional y la productividad.</p>
        </div>

        <nav className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 mt-4 md:mt-0">
          <Link
            href="#caracteristicas"
            className="hover:text-primary transition-colors"
          >
            Características
          </Link>
          <Link
            href="#beneficios"
            className="hover:text-primary transition-colors"
          >
            Beneficios
          </Link>
          <Link
            href="#contacto"
            className="hover:text-primary transition-colors"
          >
            Contacto
          </Link>
          <Link
            href="/privacy"
            className="hover:text-primary transition-colors"
          >
            Política de Privacidad
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Términos de Servicio
          </Link>
        </nav>
      </div>
    </footer>
  );
}
