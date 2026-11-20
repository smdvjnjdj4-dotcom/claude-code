"use client";

import { BellRing, Heart, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { setConsentAction, toggleFavoriteAction, toggleFollowAction } from "@/app/actions/customer";
import { cn } from "@/lib/utils";
import { buttonClass } from "./ui";

export function RelationButtons({ businessId, favorite, following, loggedIn, path }: { businessId: string; favorite: boolean; following: boolean; loggedIn: boolean; path: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [fav, setFav] = useOptimistic(favorite);
  const [fol, setFol] = useOptimistic(following);
  const guard = () => {
    if (!loggedIn) router.push(`/login?next=${encodeURIComponent(path)}`);
    return loggedIn;
  };
  return (
    <div className="flex gap-2">
      <button
        className={buttonClass(fol ? "soft" : "outline", "sm")}
        onClick={() => guard() && start(async () => { setFol(!fol); await toggleFollowAction(businessId, !fol, path); })}
      >
        <UserPlus size={15} /> {fol ? "Folgst du" : "Folgen"}
      </button>
      <button
        className={buttonClass("outline", "icon", "h-9 w-9")}
        aria-label={fav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
        aria-pressed={fav}
        onClick={() => guard() && start(async () => { setFav(!fav); await toggleFavoriteAction(businessId, !fav, path); })}
      >
        <Heart size={16} className={cn(fav && "fill-danger text-danger")} />
      </button>
    </div>
  );
}

/** Explicit, granular opt-in for marketing push from ONE business (default: off). */
export function ConsentToggle({ businessId, businessName, granted, loggedIn, path, consentText }: { businessId: string; businessName: string; granted: boolean; loggedIn: boolean; path: string; consentText: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(granted);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"><BellRing size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Updates von {businessName}</p>
          <p className="mt-1 text-sm text-muted">{consentText}</p>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (!loggedIn) return router.push(`/login?next=${encodeURIComponent(path)}`);
          const next = !on;
          start(async () => {
            const r = await setConsentAction(businessId, next, "business_profile", path);
            if (r.ok) setOn(next);
            else setError(r.error);
          });
        }}
        className={buttonClass(on ? "outline" : "primary", "sm", "mt-4 w-full")}
      >
        {on ? "Abonniert ✓ – abbestellen" : "Updates abonnieren"}
      </button>
    </div>
  );
}
