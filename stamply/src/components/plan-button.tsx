"use client";

import { useState, useTransition } from "react";
import { changePlanAction } from "@/app/actions/business";
import type { Plan } from "@/db/schema";
import { Spinner } from "./forms";
import { buttonClass } from "./ui";

export function PlanButton({ plan, label }: { plan: Plan; label: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div>
      <button disabled={pending} onClick={() => start(async () => { const r = await changePlanAction(plan); setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "") : r.error }); })} className={buttonClass("primary", "md", "w-full")}>
        {pending && <Spinner />} {label}
      </button>
      {msg && <p className={`mt-2 text-center text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
