// src/lib/session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PublicError } from "@/lib/errors";

type MinimalUser = {
  id: string;
  companyId?: string | null;
  role?: { permissions?: string[] | null } | null;
};

export async function getSessionSafe() {
  const session = await getServerSession(authOptions);
  return session ?? null;
}

/**
 * Exige sesión válida. Lanza error 401 si no hay sesión.
 * Retorna user + companyId ya listo para scoping.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new PublicError("No autorizado", 401);
  }
  const user = session.user as MinimalUser;
  return {
    session,
    user,
    companyId: user.companyId ?? null,
  };
}

/**
 * Exige sesión y que tenga companyId (tenant). Úsalo para endpoints que
 * operan SIEMPRE dentro del tenant del usuario.
 */
export async function requireCompanyScope() {
  const { session, user, companyId } = await requireSession();
  if (!companyId) {
    throw new PublicError("Sin tenant asociado", 403);
  }
  return { session, user, companyId };
}
