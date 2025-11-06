// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Navbar from "@/components/app/Navbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar sólo para la app interna */}
      <Navbar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
