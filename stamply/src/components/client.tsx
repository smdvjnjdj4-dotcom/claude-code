"use client";

import { Bell, BellOff, Check, Copy, Laptop, MapPin, Moon, Navigation, Sun, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CITY_PRESETS } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { buttonClass } from "./ui";
import { Spinner } from "./forms";

/* ─────────────────────────── Theme ─────────────────────────── */

type Theme = "system" | "light" | "dark";
function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      setTheme((localStorage.getItem("stamply-theme") as Theme) || "system");
    } catch {}
  }, []);
  const set = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem("stamply-theme", t);
    } catch {}
    applyTheme(t);
  };
  const opts: { id: Theme; icon: React.ReactNode; label: string }[] = [
    { id: "light", icon: <Sun size={16} />, label: "Hell" },
    { id: "dark", icon: <Moon size={16} />, label: "Dunkel" },
    { id: "system", icon: <Laptop size={16} />, label: "System" },
  ];
  return (
    <div className="inline-flex rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Darstellung">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={theme === o.id}
          onClick={() => set(o.id)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition",
            theme === o.id ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {o.icon}
          {!compact && o.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── Location picker ─────────────────────────── */

export function LocationPicker({
  label,
  saveAction,
}: {
  label: string | null;
  saveAction: (loc: { label: string; lat: number; lng: number } | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const choose = (loc: { label: string; lat: number; lng: number } | null) =>
    start(async () => {
      await saveAction(loc);
      setOpen(false);
      router.refresh();
    });

  const useGeo = () => {
    setError(null);
    if (!("geolocation" in navigator)) return setError("Dein Browser unterstützt keine Standortfreigabe.");
    navigator.geolocation.getCurrentPosition(
      (pos) => choose({ label: "Aktueller Standort", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Standort konnte nicht ermittelt werden. Bitte wähle eine Stadt."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group flex min-w-0 items-center gap-1.5 text-left">
        <MapPin size={16} className="shrink-0 text-brand" />
        <span className="truncate text-[15px] font-semibold group-hover:underline">{label ?? "Standort wählen"}</span>
        <span className="text-muted">▾</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-[2rem] bg-surface p-6 shadow-pop animate-fade-up sm:rounded-[2rem] safe-bottom"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Standort wählen"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Standort wählen</h2>
              <button className={buttonClass("ghost", "icon")} onClick={() => setOpen(false)} aria-label="Schließen">
                <X size={18} />
              </button>
            </div>
            <button onClick={useGeo} disabled={pending} className={buttonClass("primary", "md", "w-full")}>
              {pending ? <Spinner /> : <Navigation size={16} />} Aktuellen Standort verwenden
            </button>
            <p className="mt-2 text-xs text-muted">
              Dein Standort wird gerundet (~100 m) nur in einem Cookie auf diesem Gerät gespeichert und für die Entfernungsberechnung genutzt.
            </p>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {CITY_PRESETS.map((c) => (
                <button key={c.label} onClick={() => choose(c)} disabled={pending} className="rounded-2xl bg-surface-2 px-4 py-3 text-left text-sm font-medium transition hover:bg-surface-3">
                  {c.label}
                </button>
              ))}
            </div>
            {label && (
              <button onClick={() => choose(null)} className="mt-4 w-full text-center text-sm font-medium text-muted hover:text-fg">
                Standort entfernen
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── Push opt-in ─────────────────────────── */

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<"loading" | "unsupported" | "denied" | "off" | "on" | "unconfigured">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!vapidKey) return setState("unconfigured");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !window.isSecureContext) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [vapidKey]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      setState(res.ok ? "on" : "off");
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const text: Record<typeof state, string> = {
    loading: "Wird geprüft …",
    unsupported: "Dieser Browser unterstützt keine Push-Nachrichten. Tipp: Auf dem iPhone STAMPLY zuerst „Zum Home-Bildschirm“ hinzufügen.",
    denied: "Benachrichtigungen sind im Browser blockiert. Du kannst sie in den Website-Einstellungen wieder erlauben.",
    off: "Erhalte Stempel-Bestätigungen und – nur wenn du es pro Geschäft erlaubst – Angebote direkt aufs Gerät.",
    on: "Push ist auf diesem Gerät aktiv.",
    unconfigured: "Web-Push ist auf diesem Server noch nicht eingerichtet (VAPID-Schlüssel fehlen). Nachrichten erscheinen weiterhin in deinem Postfach.",
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-md text-sm text-muted">{text[state]}</p>
      {state === "off" && (
        <button onClick={enable} disabled={busy} className={buttonClass("primary", "sm")}>
          {busy ? <Spinner /> : <Bell size={15} />} Push aktivieren
        </button>
      )}
      {state === "on" && (
        <button onClick={disable} disabled={busy} className={buttonClass("outline", "sm")}>
          {busy ? <Spinner /> : <BellOff size={15} />} Auf diesem Gerät deaktivieren
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── Misc ─────────────────────────── */

export function CopyButton({ value, label = "Kopieren" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("outline", "sm")}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check size={15} /> : <Copy size={15} />} {done ? "Kopiert" : label}
    </button>
  );
}

export function Countdown({ until, onExpire }: { until: string; onExpire?: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, new Date(until).getTime() - Date.now());
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        onExpire?.();
      }
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);
  const s = Math.ceil(left / 1000);
  return <span className="tabular-nums">{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}</span>;
}
