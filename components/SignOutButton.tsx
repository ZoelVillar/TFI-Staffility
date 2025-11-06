// src/components/SignOutButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <Button onClick={() => signOut({ callbackUrl: "/" })}>
      {" "}
      {/* Redirige a la landing después de cerrar sesión */}
      Cerrar Sesión
    </Button>
  );
}
