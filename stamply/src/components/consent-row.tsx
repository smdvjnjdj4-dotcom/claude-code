"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setConsentAction } from "@/app/actions/customer";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";

export function ConsentRow({ businessId, name, slug, logo, granted, text }: { businessId: string; name: string; slug: string; logo: string | null; granted: boolean; text: string }) {
  const [on, setOn] = useState(granted);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface-2">
      <Avatar name={name} src={logo} size={36} />
      <Link href={`/b/${slug}`} className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted">{on ? "Angebote per Push erlaubt" : "Keine Werbenachrichten"}</p>
      </Link>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Updates von ${name}`}
        title={text}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setConsentAction(businessId, !on, "privacy_center", "/profile");
            if (r.ok) setOn(!on);
          })
        }
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-brand" : "bg-surface-3", pending && "opacity-60")}
      >
        <span className={cn("absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
      </button>
    </div>
  );
}
