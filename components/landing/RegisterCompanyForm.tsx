// src/components/landing/RegisterCompanyForm.tsx
"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// --- Validación ---
const phoneRegex = /^\+?[0-9\s().-]{7,}$/; // simple y permisivo: +54 11 5555-5555, etc.

const FormSchema = z.object({
  companyName: z
    .string()
    .min(2, "El nombre de la empresa es muy corto")
    .max(120, "Máximo 120 caracteres"),
  numEmployees: z.enum(["10", "50", "200", "500", "1000"], {
    required_error: "Selecciona un rango de empleados",
  }),
  contactName: z
    .string()
    .min(2, "Tu nombre es muy corto")
    .max(120, "Máximo 120 caracteres"),
  contactEmail: z.string().email("Ingresa un email válido"),
  phone: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || phoneRegex.test(v), {
      message: "Formato de teléfono inválido",
    }),
});

type FormValues = z.infer<typeof FormSchema>;

// --- Utilidad de errores ---
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Ocurrió un error desconocido";
  }
}

export function RegisterCompanyForm() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      companyName: "",
      numEmployees: undefined,
      contactEmail: "",
      contactName: "",
      phone: "",
    },
    mode: "onBlur",
  });

  // Mantener el layout estable: área fija para mensajes
  const ErrorArea = (
    <div
      aria-live="polite"
      className="min-h-[20px] text-center text-sm text-destructive"
    >
      {serverError ?? ""}
    </div>
  );

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/register-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: values.companyName.trim(),
          numEmployees: parseInt(values.numEmployees, 10),
          contactEmail: values.contactEmail.trim(),
          contactName: values.contactName.trim(),
          phone: values.phone?.trim() || null,
          industry: "IT Software Development",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message || "Algo salió mal al registrar la empresa."
        );
      }

      setSuccess(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Al cerrar, limpiamos todo para una próxima apertura prolija
      setSuccess(false);
      setServerError(null);
      setIsLoading(false);
      reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="px-8 py-3">
          Empezar Ahora
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        {success ? (
          // --- Caso de éxito: mensaje + cerrar ---
          <div className="py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl text-primary">
                ¡Registro exitoso!
              </DialogTitle>
              <DialogDescription className="text-base">
                ¡Gracias por tu interés en Staffility!
              </DialogDescription>
            </DialogHeader>

            <p className="mt-4 text-muted-foreground">
              Te estaremos contactando pronto para continuar con el proceso.
            </p>

            <DialogFooter className="mt-6">
              <Button onClick={() => handleOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          // --- Formulario ---
          <div className="py-2">
            <DialogHeader>
              <DialogTitle>Registra tu Empresa</DialogTitle>
              <DialogDescription>
                Completa los datos para empezar a gestionar el bienestar de tu
                equipo.
              </DialogDescription>
            </DialogHeader>

            {/* Área de error de servidor (altura fija para evitar “salto” de layout) */}
            <div className="mt-2">{ErrorArea}</div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-4 py-2"
              noValidate
            >
              {/* Empresa */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="companyName" className="text-right">
                  Empresa
                </Label>
                <div className="col-span-3">
                  <Input
                    id="companyName"
                    placeholder="Ej. Acme S.A."
                    {...register("companyName")}
                    aria-invalid={!!errors.companyName}
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Empleados */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="numEmployees" className="text-right">
                  Empleados
                </Label>
                <div className="col-span-3">
                  <Controller
                    control={control}
                    name="numEmployees"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="numEmployees">
                          <SelectValue placeholder="Selecciona el rango" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">1-10</SelectItem>
                          <SelectItem value="50">11-50</SelectItem>
                          <SelectItem value="200">51-200</SelectItem>
                          <SelectItem value="500">201-500</SelectItem>
                          <SelectItem value="1000">+500</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.numEmployees && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.numEmployees.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Nombre */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactName" className="text-right">
                  Tu Nombre
                </Label>
                <div className="col-span-3">
                  <Input
                    id="contactName"
                    placeholder="Ej. Zoel Villar"
                    {...register("contactName")}
                    aria-invalid={!!errors.contactName}
                  />
                  {errors.contactName && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.contactName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactEmail" className="text-right">
                  Email
                </Label>
                <div className="col-span-3">
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="nombre@empresa.com"
                    autoComplete="email"
                    {...register("contactEmail")}
                    aria-invalid={!!errors.contactEmail}
                  />
                  {errors.contactEmail && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.contactEmail.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Teléfono (opcional) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Teléfono
                </Label>
                <div className="col-span-3">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 11 5555-5555"
                    autoComplete="tel"
                    {...register("phone")}
                    aria-invalid={!!errors.phone}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
