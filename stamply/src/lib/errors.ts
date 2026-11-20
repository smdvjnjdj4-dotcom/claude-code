import { ZodError } from "zod";

/**
 * An expected, user-facing error from the domain layer. `message` is shown to the user (German),
 * `code` is stable and used by tests and logs.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Wraps a server action body: domain errors become friendly results, others are logged. */
export async function toResult<T>(fn: () => Promise<T>, okMessage?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message: okMessage };
  } catch (e) {
    if (isDomainError(e)) return { ok: false, error: e.message };
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: e.issues[0]?.message ?? "Bitte prüfe deine Eingaben.", fieldErrors };
    }
    // Next.js uses thrown errors for redirect()/notFound(); let them through.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "Etwas ist schiefgelaufen. Bitte versuche es erneut." };
  }
}
