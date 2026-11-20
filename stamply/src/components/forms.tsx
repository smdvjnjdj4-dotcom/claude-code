"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { buttonClass, Hint, Label } from "./ui";

type FormAction = (prev: ActionResult<unknown> | null, form: FormData) => Promise<ActionResult<unknown>>;

const FieldErrors = createContext<Record<string, string>>({});

/**
 * Standard form wrapper for server actions: shows pending state, error and success messages,
 * and exposes per-field errors to <Field>. Works without JavaScript (progressive enhancement).
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  className,
  resetOnSuccess,
  hideSubmit,
  fullWidthSubmit,
  onSuccess,
  confirm,
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel?: string;
  submitVariant?: Parameters<typeof buttonClass>[0];
  className?: string;
  resetOnSuccess?: boolean;
  hideSubmit?: boolean;
  fullWidthSubmit?: boolean;
  onSuccess?: (r: ActionResult<unknown>) => void;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={cn("space-y-4", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <FieldErrors.Provider value={state && !state.ok ? (state.fieldErrors ?? {}) : {}}>{children}</FieldErrors.Provider>
      <FormMessage state={state} />
      {!hideSubmit && submitLabel && (
        <SubmitButton variant={submitVariant} className={fullWidthSubmit ? "w-full" : undefined}>
          {submitLabel}
        </SubmitButton>
      )}
    </form>
  );
}

export function FormMessage({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (!state.ok)
    return (
      <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger animate-fade-up">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-2xl bg-success-soft px-4 py-3 text-sm font-medium text-success animate-fade-up">
        {state.message}
      </p>
    );
  return null;
}

export function SubmitButton({ children, variant = "primary", className, name, value }: { children: ReactNode; variant?: Parameters<typeof buttonClass>[0]; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={buttonClass(variant, "md", className)} aria-busy={pending}>
      {pending && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Label + control + hint + server-side validation error for `name`. */
export function Field({ label, name, hint, children, className }: { label: ReactNode; name: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  const errors = useContext(FieldErrors);
  const err = errors[name];
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {err ? <p className="mt-1.5 text-xs font-medium text-danger">{err}</p> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}
