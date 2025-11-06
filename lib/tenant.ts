// src/lib/tenant.ts
import { hasAnyPermission, hasRole } from "@/lib/auth";
import { PERMISSIONS } from "@/config/roles";
import { PublicError } from "@/lib/errors";

type MaybeUser = {
  role?: { permissions?: string[] | null } | null;
  companyId?: string | null;
};

export function isSystemAdmin(user: MaybeUser | null | undefined) {
  return hasRole(user, "SystemAdmin");
}

export function scopeByCompany<T extends Record<string, any>>(
  user: MaybeUser | null | undefined,
  companyId: string | null | undefined,
  extra: T = {} as T,
  opts?: { allowSystemWide?: boolean }
) {
  const allowSystemWide = !!opts?.allowSystemWide;
  const isSystem = isSystemAdmin(user);

  if (allowSystemWide && isSystem) {
    return { ...extra } as T;
  }
  if (!companyId) {
    throw new PublicError("Sin tenant asociado", 403);
  }
  return { ...extra, companyId };
}
