"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function TopNavLink({ href, children, exact }: { href: string; children: ReactNode; exact?: boolean }) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link
      href={href}
      className={cn("rounded-full px-4 py-2 text-[15px] font-medium transition", active ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg")}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export function TabLink({ href, icon, label, exact, badge }: { href: string; icon: ReactNode; label: string; exact?: boolean; badge?: number }) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link href={href} className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition", active ? "text-brand" : "text-muted")} aria-current={active ? "page" : undefined}>
      <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition", active && "bg-brand-soft")}>{icon}</span>
      {label}
      {!!badge && <span className="absolute right-[calc(50%-22px)] top-1 h-2 w-2 rounded-full bg-danger" />}
    </Link>
  );
}

export function SideNavLink({ href, icon, label, exact, badge }: { href: string; icon: ReactNode; label: string; exact?: boolean; badge?: number }) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition",
        active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {!!badge && <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
    </Link>
  );
}
