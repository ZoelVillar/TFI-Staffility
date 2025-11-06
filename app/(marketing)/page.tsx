// src/app/(marketing)/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Importar Button de Shadcn/ui
import { cn } from "@/lib/utils"; // Para combinar clases
import { RegisterCompanyForm } from "@/components/landing/RegisterCompanyForm";
import "dotenv/config";

// Importar iconos de lucide-react para un toque más profesional
import {
  CheckCircle,
  Award,
  Briefcase,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";

export default function LandingPage() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  const pricingPlans = [
    {
      name: "Classic",
      price: "10.000",
      per: "empleado/mes",
      features: [
        "Detección de burnout",
        "Informes básicos",
        "Soporte estándar",
      ],
      buttonText: "Empezar con Classic",
      buttonLink: "/register?plan=classic",
    },
    {
      name: "Professional",
      price: "13.000",
      per: "empleado/mes",
      features: [
        "Todo en Classic",
        "Informes detallados",
        "Recomendaciones personalizadas",
        "Integraciones básicas",
      ],
      buttonText: "Elegir Professional",
      buttonLink: "/register?plan=professional",
      isFeatured: true, // Para destacar este plan
    },
    {
      name: "Enterprise",
      price: "16.000",
      per: "empleado/mes",
      features: [
        "Todo en Professional",
        "Soporte prioritario 24/7",
        "Panel de control avanzado",
        "Integraciones personalizadas",
        "Consultoría estratégica",
      ],
      buttonText: "Contactar por Enterprise",
      buttonLink: "/contact?plan=enterprise",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Hero Section */}
      <section
        id="inicio"
        className="relative w-full py-24 md:py-36 lg:py-52 bg-gradient-to-br from-green-600 to-green-800 text-white flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 z-0 opacity-10">
          {/* Fondo con formas abstractas o patrón sutil */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full filter blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white opacity-5 rounded-full filter blur-3xl animate-pulse-slow delay-500"></div>
        </div>
        <div className="container mx-auto px-6 text-center z-10 relative">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold mb-6 leading-tight drop-shadow-lg animate-fade-in-down">
            Potencia el Bienestar y la Productividad de tu Equipo
          </h1>
          <p className="text-lg sm:text-xl text-green-100 max-w-4xl mx-auto mb-12 animate-fade-in-up delay-200">
            Staffility es la plataforma definitiva para prevenir el burnout,
            mejorar el rendimiento y crear una cultura laboral próspera en
            equipos de software.
          </p>
          <Button
            size="lg"
            className="bg-white text-green-700 hover:bg-gray-100 px-10 py-6 text-lg rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 animate-fade-in-up delay-400"
            asChild
          >
            <Link href="/dashboard">Comienza tu Prueba Gratuita</Link>
          </Button>
          <p className="mt-4 text-green-200 text-sm animate-fade-in-up delay-500">
            Sin tarjeta de crédito. Cancela en cualquier momento.
          </p>
        </div>
      </section>

      {/* Trust Badges/Logos (New Section) */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-8">
            Confían en nosotros equipos innovadores de la industria
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-75">
            {/* Replace with actual company logos if available, use placeholders for now */}
            <img
              src="https://via.placeholder.com/120x40?text=TechCorp"
              alt="TechCorp Logo"
              className="h-8 md:h-10 grayscale hover:grayscale-0 transition-all duration-300"
            />
            <img
              src="https://via.placeholder.com/120x40?text=InnovateInc"
              alt="InnovateInc Logo"
              className="h-8 md:h-10 grayscale hover:grayscale-0 transition-all duration-300"
            />
            <img
              src="https://via.placeholder.com/120x40?text=GlobalDevs"
              alt="GlobalDevs Logo"
              className="h-8 md:h-10 grayscale hover:grayscale-0 transition-all duration-300"
            />
            <img
              src="https://via.placeholder.com/120x40?text=FutureSoft"
              alt="FutureSoft Logo"
              className="h-8 md:h-10 grayscale hover:grayscale-0 transition-all duration-300"
            />
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section id="caracteristicas" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Soluciones Diseñadas para Equipos de Alto Rendimiento
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-16">
            Desde la prevención proactiva hasta la mejora continua, Staffility
            te ofrece las herramientas que necesitas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="flex flex-col items-center p-8 bg-card border border-green-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-green-100 text-green-700 p-4 rounded-full mb-6 shadow-md">
                <Briefcase className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Detección Inteligente de Burnout
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Utilizamos algoritmos avanzados para identificar señales
                tempranas de agotamiento, permitiendo intervenciones proactivas.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center p-8 bg-card border border-green-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-green-100 text-green-700 p-4 rounded-full mb-6 shadow-md">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Análisis de Rendimiento y Bienestar
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Obtén informes detallados y visualizaciones claras sobre la
                productividad y el estado emocional de tu equipo.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center p-8 bg-card border border-green-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="bg-green-100 text-green-700 p-4 rounded-full mb-6 shadow-md">
                <Award className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Fomento de una Cultura Positiva
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Herramientas y recomendaciones para construir un ambiente de
                trabajo donde la innovación y la colaboración florezcan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section (New Section) */}
      <section id="como-funciona" className="py-20 md:py-28 bg-green-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Simple, Intuitivo y Poderoso
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-16">
            Descubre cómo Staffility se integra sin esfuerzo en tu flujo de
            trabajo diario.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md border-t-4 border-green-500">
              <div className="text-5xl font-bold text-green-600 mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Configuración Rápida
              </h3>
              <p className="text-gray-600">
                Integra Staffility en minutos con tus herramientas existentes.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md border-t-4 border-green-500">
              <div className="text-5xl font-bold text-green-600 mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Recopilación Discreta
              </h3>
              <p className="text-gray-600">
                Recopilamos datos de bienestar de forma anónima y no intrusiva.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md border-t-4 border-green-500">
              <div className="text-5xl font-bold text-green-600 mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Acción y Mejora
              </h3>
              <p className="text-gray-600">
                Obtén insights accionables para impulsar cambios positivos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Revised */}
      <section id="beneficios" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Resultados Tangibles para tu Negocio
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-16">
            Invierte en el bienestar de tu equipo y observa el retorno en cada
            métrica de negocio.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <h3 className="text-3xl font-bold text-green-700 mb-6">
                Transforma Desafíos en Oportunidades
              </h3>
              <ul className="text-lg text-gray-700 space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>
                    <strong className="text-gray-900">
                      Reduce la Rotación:
                    </strong>{" "}
                    Retén a tus talentos más valiosos creando un ambiente donde
                    prosperen.
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>
                    <strong className="text-gray-900">
                      Aumenta la Productividad:
                    </strong>{" "}
                    Equipos felices son equipos más eficientes y creativos.
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>
                    <strong className="text-gray-900">
                      Mejora la Calidad:
                    </strong>{" "}
                    Menos estrés se traduce en menos errores y mejor código.
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>
                    <strong className="text-gray-900">
                      Fomenta la Innovación:
                    </strong>{" "}
                    Un entorno de apoyo estimula nuevas ideas y soluciones.
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>
                    <strong className="text-gray-900">
                      Optimiza Recursos:
                    </strong>{" "}
                    Toma decisiones basadas en datos sobre asignación de
                    proyectos y cargas de trabajo.
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center items-center">
              {/* Placeholder para una ilustración más dinámica o un gráfico */}
              <div className="w-full max-w-lg h-80 bg-green-100 flex items-center justify-center rounded-xl shadow-xl overflow-hidden relative">
                <img
                  src="https://via.placeholder.com/600x400?text=Analytics+Dashboard"
                  alt="Dashboard illustration"
                  className="object-cover w-full h-full opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-green-300/20 to-green-600/20 flex items-center justify-center">
                  <Users className="h-24 w-24 text-green-700 opacity-60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section (New Section) */}
      <section
        id="testimonios"
        className="py-20 md:py-28 bg-green-800 text-white"
      >
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <p className="text-lg text-green-100 max-w-3xl mx-auto mb-16">
            Historias reales de empresas que transformaron el bienestar y la
            productividad con Staffility.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Testimonial 1 */}
            <div className="bg-green-700 p-8 rounded-xl shadow-lg flex flex-col items-center text-center">
              <img
                src="https://via.placeholder.com/80x80?text=JD"
                alt="Avatar John Doe"
                className="rounded-full w-20 h-20 mb-4 border-4 border-green-500"
              />
              <p className="italic text-lg mb-4 text-green-100">
                "Staffility nos ha permitido identificar y abordar
                proactivamente el estrés en nuestro equipo, resultando en una
                mejora significativa del ambiente laboral y la retención."
              </p>
              <p className="font-semibold text-white">
                - Juan Pérez, CTO en InnovaTech
              </p>
            </div>
            {/* Testimonial 2 */}
            <div className="bg-green-700 p-8 rounded-xl shadow-lg flex flex-col items-center text-center">
              <img
                src="https://via.placeholder.com/80x80?text=AS"
                alt="Avatar Jane Smith"
                className="rounded-full w-20 h-20 mb-4 border-4 border-green-500"
              />
              <p className="italic text-lg mb-4 text-green-100">
                "La interfaz es increíblemente intuitiva y los informes son de
                gran valor. Hemos visto un aumento en la moral y la colaboración
                desde que usamos Staffility."
              </p>
              <p className="font-semibold text-white">
                - Ana García, HR Manager en CodeCrafters
              </p>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-green-700 p-8 rounded-xl shadow-lg flex flex-col items-center text-center">
              <img
                src="https://via.placeholder.com/80x80?text=MR"
                alt="Avatar Mike Ross"
                className="rounded-full w-20 h-20 mb-4 border-4 border-green-500"
              />
              <p className="italic text-lg mb-4 text-green-100">
                "Una herramienta esencial para cualquier empresa de tecnología.
                Nos ha ayudado a crear un entorno más saludable y a mantener a
                nuestros ingenieros motivados."
              </p>
              <p className="font-semibold text-white">
                - Miguel Rivas, CEO en DataSolutions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Planes Flexibles para Cada Necesidad
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-16">
            Elige el plan que mejor se adapte al tamaño y las ambiciones de tu
            equipo. Todos nuestros planes incluyen soporte y actualizaciones.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={cn(
                  "flex flex-col p-8 rounded-xl shadow-lg border-2",
                  plan.isFeatured
                    ? "bg-green-700 text-white border-green-700 transform scale-105 transition-transform duration-300"
                    : "bg-white border-green-100"
                )}
              >
                <h3
                  className={cn(
                    "text-3xl font-bold mb-4",
                    plan.isFeatured ? "text-white" : "text-gray-800"
                  )}
                >
                  {plan.name}
                </h3>
                <p
                  className={cn(
                    "text-5xl font-extrabold mb-2",
                    plan.isFeatured ? "text-white" : "text-green-700"
                  )}
                >
                  ${plan.price}
                  <span
                    className={cn(
                      "text-lg font-medium",
                      plan.isFeatured ? "text-green-200" : "text-gray-500"
                    )}
                  >
                    ARS
                  </span>
                </p>
                <p
                  className={cn(
                    "text-lg mb-8",
                    plan.isFeatured ? "text-green-100" : "text-gray-600"
                  )}
                >
                  /{plan.per}
                </p>
                <ul className="text-left flex-grow space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-center",
                        plan.isFeatured ? "text-green-100" : "text-gray-700"
                      )}
                    >
                      <CheckCircle
                        className={cn(
                          "h-5 w-5 mr-3",
                          plan.isFeatured ? "text-green-300" : "text-green-500"
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className={cn(
                    "w-full py-3 text-lg rounded-full transition-all duration-300 transform",
                    plan.isFeatured
                      ? "bg-white text-green-700 hover:bg-gray-100 hover:scale-105 shadow-md"
                      : "bg-green-600 text-white hover:bg-green-700 hover:scale-105 shadow-md"
                  )}
                  asChild
                >
                  <Link href={plan.buttonLink}>{plan.buttonText}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section - Final */}
      <section id="contacto" className="py-20 md:py-28 bg-green-50 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Listo para Elevar el Potencial de tu Equipo?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
            Únete a la creciente comunidad de líderes que están construyendo
            equipos más felices, saludables y productivos con Staffility.
          </p>
          <RegisterCompanyForm />
          <p className="mt-8 text-gray-500 text-sm">
            ¿Tienes preguntas?{" "}
            <Link href="/contact" className="text-green-700 hover:underline">
              Contáctanos
            </Link>{" "}
            para una consulta personalizada.
          </p>
        </div>
      </section>

      {/* Footer (New Section) */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">
              Staffility
            </h3>
            <p className="text-gray-400 text-sm">
              Potenciando el bienestar y la productividad de equipos de
              software.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-green-300">
              Navegación
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#inicio"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  href="#caracteristicas"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Características
                </Link>
              </li>
              <li>
                <Link
                  href="#beneficios"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Beneficios
                </Link>
              </li>
              <li>
                <Link
                  href="#precios"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Precios
                </Link>
              </li>
              <li>
                <Link
                  href="#contacto"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-green-300">
              Recursos
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Blog (Próximamente)
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  FAQ (Próximamente)
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Soporte
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4 text-green-300">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Términos de Servicio
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-6 mt-10 text-center text-gray-500 text-sm border-t border-gray-700 pt-8">
          &copy; {new Date().getFullYear()} Staffility. Todos los derechos
          reservados.
        </div>
      </footer>
    </div>
  );
}
