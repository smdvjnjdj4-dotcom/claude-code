"use client";

import { useState, useTransition } from "react";
import { acceptInviteAction } from "@/app/actions/business";
import { Spinner } from "./forms";
import { buttonClass } from "./ui";

export function AcceptInvite({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <button disabled={pending} onClick={() => start(async () => { const r = await acceptInviteAction(token); if (!r.ok) setErr(r.error); })} className={buttonClass("primary", "md", "w-full")}>
        {pending && <Spinner />} Einladung annehmen
      </button>
      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </div>
  );
}
