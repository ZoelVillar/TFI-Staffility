import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PublicError } from "@/lib/errors";

type MinimalUser = {
  id: string;
  companyId?: string | null;
  managerId?: string | null; // <- NUEVO para "mi equipo"
  role?: {
    id?: string | null;
    name?: string | null; // <- NUEVO para hasRole
    permissions?: string[] | null; // ya estaba
  } | null;
};

export async function getSessionSafe() {
  const session = await getServerSession(authOptions);
  return session ?? null;
}

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

export async function requireCompanyScope() {
  const { session, user, companyId } = await requireSession();
  if (!companyId) throw new PublicError("Sin tenant asociado", 403);
  return { session, user, companyId };
}
