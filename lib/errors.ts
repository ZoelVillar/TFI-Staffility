// lib/errors.ts
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err instanceof PublicError) return err.message;
  if (typeof err === "string") return err;

  // ¿tiene .message string sin usar any?
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return "Ocurrió un error desconocido";
  }
}

export class PublicError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PublicError";
    this.status = status;
  }
}
