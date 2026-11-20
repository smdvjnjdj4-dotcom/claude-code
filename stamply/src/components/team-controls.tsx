"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { changeRoleAction, removeMemberAction, revokeInviteAction } from "@/app/actions/business";
import type { ActionResult } from "@/lib/errors";
import { CopyButton } from "./client";
import { FormMessage, Spinner, SubmitButton } from "./forms";
import { buttonClass, Select } from "./ui";

export function MemberControls({ userId, role }: { userId: string; role: "owner" | "manager" | "staff" }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      {pending && <Spinner />}
      <Select
        defaultValue={role}
        className="h-9 w-44 text-sm"
        aria-label="Rolle"
        onChange={(e) => start(async () => { const r = await changeRoleAction(userId, e.target.value as "manager" | "staff"); setErr(r.ok ? null : r.error); })}
      >
        <option value="staff">Mitarbeiter:in</option>
        <option value="manager">Manager:in</option>
      </Select>
      <button className={buttonClass("ghost", "sm", "text-danger")} onClick={() => confirm("Teammitglied entfernen?") && start(async () => { const r = await removeMemberAction(userId); setErr(r.ok ? null : r.error); })}>Entfernen</button>
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}

export function RevokeInvite({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} className={buttonClass("ghost", "sm")} onClick={() => start(() => revokeInviteAction(id))}>Zurückziehen</button>;
}

export function InviteResult({ action, children }: { action: (p: ActionResult<{ link: string }> | null, f: FormData) => Promise<ActionResult<{ link: string }>>; children: ReactNode }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      {children}
      <FormMessage state={state} />
      {state?.ok && state.data && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <code className="min-w-0 flex-1 truncate text-sm">{state.data.link}</code>
          <CopyButton value={state.data.link} label="Link kopieren" />
        </div>
      )}
      <SubmitButton>Einladungslink erstellen</SubmitButton>
    </form>
  );
}
