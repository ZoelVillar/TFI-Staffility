// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, {
  type NextAuthOptions,
  type SessionStrategy,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/security";
import { PublicError } from "@/lib/errors";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        // 1) Validación server-side (Zod)
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });
        if (!parsed.success) {
          throw new PublicError(
            parsed.error.issues[0]?.message ?? "Credenciales inválidas",
            400
          );
        }
        const { email, password } = parsed.data;

        // 2) Buscar usuario (con lo mínimo para validar)
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
          },
        });

        if (!user || !user.password) {
          throw new PublicError("Email o contraseña incorrectos", 401);
        }

        // 3) Verificar password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          throw new PublicError("Email o contraseña incorrectos", 401);
        }

        // 4) Devolver shape mínimo; el resto se carga en session() desde DB
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt" satisfies SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  jwt: {
    secret: process.env.NEXTAUTH_JWT_SECRET,
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    /**
     * Guardamos solo el identificador del usuario en el token.
     * Toda la metadata (companyId, managerId, role.*) se obtiene en session()
     * para evitar datos stale y JWTs gigantes.
     */
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id; // <- clave: ID del usuario
      }
      return token;
    },

    /**
     * Ensamblamos la sesión consultando la DB con SELECT explícito
     * (no exponemos campos sensibles como salary, notes, documentId, etc.).
     */
    async session({ session, token }) {
      const uid = token.uid as string | undefined;
      if (!uid) return session;

      const dbUser = await prisma.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          companyId: true,
          managerId: true,
          role: { select: { id: true, name: true, permissions: true } },
        },
      });

      if (dbUser && session.user) {
        session.user.id = dbUser.id;
        session.user.name = dbUser.name ?? session.user.name ?? null;
        session.user.email = dbUser.email ?? session.user.email!;
        session.user.image = dbUser.image ?? session.user.image ?? null;

        // Campos que usa tu app para scoping/roles/equipo:
        (session.user as any).companyId = dbUser.companyId ?? null;
        (session.user as any).managerId = dbUser.managerId ?? null;
        (session.user as any).role = dbUser.role
          ? {
              id: dbUser.role.id,
              name: dbUser.role.name,
              permissions: dbUser.role.permissions,
            }
          : null;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
