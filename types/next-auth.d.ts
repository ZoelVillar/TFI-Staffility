// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

// Ejemplo de shapes para lo que guardás en session/jwt.
// Cambiá/extendé según tu modelo real.
export type SessionRole = {
  id: string;
  name?: string | null;
};

export type SessionCompany = {
  id: string;
  name?: string | null;
};

declare module "next-auth" {
  interface User {
    id: string;
    companyId?: string | null;
    role?: { id: string; name: string; permissions: string[] } | null;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      companyId?: string | null;
      roleId?: string | null;
      role?: SessionRole | null;
      company?: SessionCompany | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    companyId?: string | null;
    roleId?: string | null;
    role?: SessionRole | null;
    company?: SessionCompany | null;
  }
}

// Hace que este .d.ts sea tratado como módulo y evita colisiones globales.
export {};
