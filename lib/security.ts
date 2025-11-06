// src/lib/security.ts
import { z } from "zod";

export const passwordPolicy = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un símbolo");

export function validatePassword(password: string) {
  const r = passwordPolicy.safeParse(password);
  return {
    ok: r.success,
    error: r.success ? undefined : r.error.issues[0].message,
  };
}

// Para el login validamos inputs básicos (email + password no vacía)
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});
