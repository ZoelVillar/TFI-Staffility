// src/app/(marketing)/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Importar Button de Shadcn/ui
import { cn } from "@/lib/utils"; // Para combinar clases
import { RegisterCompanyForm } from "@/components/landing/RegisterCompanyForm";
import "dotenv/config";

// Puedes importar iconos si los necesitas, por ejemplo:
// import { Rocket, Heart, Lightbulb } from "lucide-react";
// Si necesitas lucide-react, instala: npm install lucide-react

export default function LandingPage() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section
        id="inicio"
        className="relative w-full py-20 md:py-32 lg:py-48 bg-gradient-to-br from-white to-gray-50 flex items-center justify-center"
      >
        <div className="container mx-auto px-4 text-center z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
            Staffility: Bienestar y Productividad para Equipos de Software
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Prevenimos el burnout laboral y potenciamos el rendimiento de tus
            ingenieros, creando un ambiente de trabajo saludable y eficiente.
          </p>
          <Button size="lg" asChild>
            <Link href="/dashboard">Comienza a Transformar Tu Equipo</Link>
          </Button>
        </div>
        {/* Opcional: añadir una imagen o ilustración de fondo */}
        {/* <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('/path/to/hero-image.jpg')" }}></div> */}
        {/* Placeholder de imagen */}
        <div className="absolute inset-0 bg-primary opacity-5 mix-blend-multiply"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Aquí podrías colocar una ilustración abstracta o icono grande */}
          {/* <Rocket className="h-48 w-48 text-primary/10" /> */}
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">
            Nuestras Soluciones Clave
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="flex flex-col items-center p-6 bg-card border border-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              {/* Icono de ejemplo (si tienes lucide-react) */}
              {/* <Lightbulb className="h-12 w-12 text-primary mb-4" /> */}
              <div className="bg-primary/10 text-primary p-3 rounded-full mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Detección Temprana de Burnout
              </h3>
              <p className="text-muted-foreground">
                Identifica señales de agotamiento en tus equipos antes de que
                afecten la productividad y el bienestar.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center p-6 bg-card border border-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="bg-primary/10 text-primary p-3 rounded-full mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Informes de Bienestar Detallados
              </h3>
              <p className="text-muted-foreground">
                Genera datos confiables sobre el estado emocional y la carga de
                trabajo de tus empleados.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center p-6 bg-card border border-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="bg-primary/10 text-primary p-3 rounded-full mb-4">
                <span className="text-2xl">🌱</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Mejora Continua del Ambiente Laboral
              </h3>
              <p className="text-muted-foreground">
                Herramientas para fomentar un entorno más saludable, motivador y
                productivo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">
            ¿Por Qué Elegir Staffility?
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="lg:order-2">
              <h3 className="text-2xl font-semibold text-primary mb-4 text-left">
                Impacto en tu Organización
              </h3>
              <ul className="text-lg text-muted-foreground list-disc list-inside text-left space-y-3">
                <li>Reduce la rotación de talento clave.</li>
                <li>Incrementa la motivación y el compromiso del equipo.</li>
                <li>Mejora la calidad del código y la velocidad de entrega.</li>
                <li>Fomenta una cultura de apoyo y reconocimiento.</li>
                <li>Optimiza la asignación de recursos y tareas.</li>
              </ul>
            </div>
            <div className="lg:order-1 flex justify-center">
              {/* Placeholder para una imagen o ilustración que represente los beneficios */}
              <div className="w-full max-w-md h-64 bg-primary/10 flex items-center justify-center rounded-lg shadow-lg">
                <span className="text-5xl text-primary">⭐</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="contacto" className="py-16 md:py-24 bg-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            Listo para Transformar el Bienestar de tu Equipo?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Únete a las empresas que ya están priorizando la salud mental y la
            eficiencia de sus ingenieros con Staffility.
          </p>
          <RegisterCompanyForm />
        </div>
      </section>
    </div>
  );
}
