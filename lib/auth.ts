// src/lib/auth.ts
import type { Session } from "next-auth";
import type { Permission, RoleName } from "@/config/roles";

type MaybeUser = {
  role?: { name?: string | null; permissions?: string[] | null } | null;
};

export function hasPermission(
  user: MaybeUser | null | undefined,
  perm: Permission
) {
  return Boolean(user?.role?.permissions?.includes(perm));
}
export function hasAnyPermission(
  user: MaybeUser | null | undefined,
  perms: Permission[]
) {
  const set = new Set(user?.role?.permissions ?? []);
  return perms.some((p) => set.has(p));
}
export function hasAllPermissions(
  user: MaybeUser | null | undefined,
  perms: Permission[]
) {
  const set = new Set(user?.role?.permissions ?? []);
  return perms.every((p) => set.has(p));
}

// Por nombre de rol (tu caso de “Administrador”)
export function hasRole(
  user: MaybeUser | null | undefined,
  roleName: RoleName
) {
  return user?.role?.name === roleName;
}

// Atajos para Session (Server Components)
export function sessionHasPermission(
  session: Session | null,
  perm: Permission
) {
  return hasPermission(session?.user, perm);
}
export function sessionHasAny(session: Session | null, perms: Permission[]) {
  return hasAnyPermission(session?.user, perms);
}
export function sessionHasAll(session: Session | null, perms: Permission[]) {
  return hasAllPermissions(session?.user, perms);
}
export function sessionHasRole(session: Session | null, roleName: RoleName) {
  return hasRole(session?.user, roleName);
}
