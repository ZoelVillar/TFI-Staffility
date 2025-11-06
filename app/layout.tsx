// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers"; // Importamos nuestro SessionProvider

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Staffility - Gestión de Bienestar Organizacional",
  description:
    "Soluciones para la gestión de empleados en empresas de desarrollo de software, con el objetivo de mejorar el bienestar organizacional y la productividad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased flex flex-col",
          inter.variable
        )}
      >
        <Providers>
          {" "}
          {/* Envolvemos toda la aplicación con el SessionProvider */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
