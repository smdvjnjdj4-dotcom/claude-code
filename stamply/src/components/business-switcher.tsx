"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { switchBusinessAction } from "@/app/actions/business";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";

export function BusinessSwitcher({ current, options, compact }: { current: string; options: { id: string; name: string; logo: string | null }[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const cur = options.find((o) => o.id === current) ?? options[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={cn("flex w-full items-center gap-2.5 rounded-2xl text-left transition hover:bg-surface-2", compact ? "px-2 py-1" : "border border-line p-2.5")} aria-expanded={open}>
        <Avatar name={cur.name} src={cur.logo} size={compact ? 28 : 34} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{cur.name}</span>
        <ChevronsUpDown size={15} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-pop animate-fade-up">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => start(async () => { await switchBusinessAction(o.id); setOpen(false); router.refresh(); })}
              className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left text-sm hover:bg-surface-2", o.id === current && "bg-brand-soft")}
            >
              <Avatar name={o.name} src={o.logo} size={28} />
              <span className="truncate font-medium">{o.name}</span>
            </button>
          ))}
          <Link href="/business/onboarding" className="mt-1 flex items-center gap-2.5 rounded-xl p-2 text-sm font-medium text-brand hover:bg-surface-2">
            <Plus size={16} /> Weiteres Unternehmen anlegen
          </Link>
        </div>
      )}
    </div>
  );
}
