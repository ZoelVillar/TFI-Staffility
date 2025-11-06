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
        // Validación server-side (Zod)
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

        // Buscamos usuario + relaciones
        const user = await prisma.user.findUnique({
          where: { email },
          include: { company: true, role: true },
        });

        if (!user || !user.password) {
          throw new PublicError("Email o contraseña incorrectos", 401);
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          throw new PublicError("Email o contraseña incorrectos", 401);
        }

        return {
          id: user.id,
          name: user.name ?? null,
          email: user.email,
          image: user.image ?? null,
          companyId: user.companyId ?? null,
          roleId: user.roleId ?? null,
          role: user.role ?? null,
          company: user.company ?? null,
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.companyId = (user as any).companyId ?? null;
        token.roleId = (user as any).roleId ?? null;
        token.role = (user as any).role ?? null;
        token.company = (user as any).company ?? null;
      }
      if (trigger === "update" && session?.name) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { role: true, company: true },
        });
        if (fresh) {
          token.name = fresh.name ?? null;
          token.email = fresh.email;
          token.companyId = fresh.companyId ?? null;
          token.roleId = fresh.roleId ?? null;
          token.role = fresh.role ?? null;
          token.company = fresh.company ?? null;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.companyId = (token.companyId as string) ?? null;
        session.user.roleId = (token.roleId as string) ?? null;
        session.user.role = token.role ?? null;
        session.user.company = token.company ?? null;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
