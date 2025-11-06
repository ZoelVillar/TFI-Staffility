// src/app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});
type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    if (result?.error) {
      setServerError(
        result.error === "CredentialsSignin"
          ? "Email o contraseña incorrectos."
          : result.error
      );
      return;
    }
    if (result?.ok) router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Acceder a Staffility
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Ingresa tus credenciales para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Área de error del servidor con altura fija para evitar saltos */}
          <div
            aria-live="polite"
            className="min-h-[20px] text-center text-sm text-destructive"
          >
            {serverError ?? ""}
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Olvidaste tu contraseña?{" "}
            <Link
              href="/auth/forgot-password"
              className="text-primary hover:underline"
            >
              Restablecer
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
