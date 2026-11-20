"use client";

import { Camera, CheckCircle2, Clock3, KeyRound, ScanLine, XCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { claimCodeAction, uploadReceiptAction, type CollectResult } from "@/app/actions/customer";
import { cn } from "@/lib/utils";
import { SubmitButton } from "./forms";
import { buttonClass, StampDots } from "./ui";

export function CollectFlow({ programId, color, initialCode, backHref }: { programId: string; color: string; initialCode?: string; backHref: string }) {
  const [tab, setTab] = useState<"receipt" | "code">(initialCode || !programId ? "code" : "receipt");
  const [receiptState, receiptAction] = useActionState(uploadReceiptAction, null);
  const [codeState, codeAction] = useActionState(claimCodeAction, null);
  const result = tab === "receipt" ? receiptState : codeState;

  if (result?.ok && result.data) return <ResultView r={result.data} color={color} backHref={backHref} />;

  return (
    <div className="space-y-5">
      {programId && <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1" role="tablist">
        {(
          [
            ["receipt", <Camera key="c" size={16} />, "Kassenbon"],
            ["code", <KeyRound key="k" size={16} />, "Code / QR"],
          ] as const
        ).map(([id, icon, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition", tab === id ? "bg-surface shadow-card" : "text-muted")}>
            {icon} {label}
          </button>
        ))}
      </div>}

      {tab === "receipt" && programId ? <ReceiptForm programId={programId} action={receiptAction} state={receiptState} /> : <CodeForm action={codeAction} state={codeState} initialCode={initialCode} />}
    </div>
  );
}

function ErrorBox({ state }: { state: CollectResult | null }) {
  if (!state || state.ok) return null;
  return <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger animate-fade-up">{state.error}</p>;
}

function ReceiptForm({ programId, action, state }: { programId: string; action: (f: FormData) => void; state: CollectResult | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="programId" value={programId} />
      <label className={cn("relative flex aspect-[3/4] max-h-[420px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed text-center transition", preview ? "border-transparent" : "border-line bg-surface hover:border-brand/50")}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vorschau des Kassenbons" className="absolute inset-0 h-full w-full object-contain bg-surface-2" />
        ) : (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft text-brand"><Camera size={28} /></span>
            <span className="mt-4 text-lg font-semibold">Kassenbon fotografieren</span>
            <span className="mt-1 max-w-[16rem] text-sm text-muted">Ganzen Bon flach und gut beleuchtet aufnehmen – Geschäftsname, Datum und Summe müssen lesbar sein.</span>
          </>
        )}
        <input
          type="file"
          name="receipt"
          accept="image/*"
          capture="environment"
          required
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>
      <ErrorBox state={state} />
      <SubmitButton className="h-13 w-full text-base">Bon prüfen & Stempel sammeln</SubmitButton>
      <p className="text-center text-xs text-muted">
        Wir erkennen automatisch Geschäft, Datum und Betrag. Unklare Bons prüft das Geschäft. Kartendaten werden nicht gespeichert, das Foto wird nach spätestens 30 Tagen gelöscht.
      </p>
    </form>
  );
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function CodeForm({ action, state, initialCode }: { action: (f: FormData) => void; state: CollectResult | null; initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !video.current) return;
          const found = await detector.detect(video.current).catch(() => []);
          const raw = found[0]?.rawValue;
          if (raw) {
            const m = raw.match(/[?&]code=([A-Za-z0-9]+)/) ?? raw.match(/^([A-Za-z0-9]{8})$/);
            if (m) {
              setCode(m[1].toUpperCase());
              setScanning(false);
              setTimeout(() => formRef.current?.requestSubmit(), 50);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setScanError("Kamera nicht verfügbar. Bitte gib den Code manuell ein.");
        setScanning(false);
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {scanning ? (
        <div className="relative overflow-hidden rounded-[2rem] bg-black">
          <video ref={video} className="aspect-square w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-10 rounded-3xl border-4 border-white/80" />
          <button type="button" onClick={() => setScanning(false)} className={buttonClass("secondary", "sm", "absolute bottom-4 left-1/2 -translate-x-1/2")}>Abbrechen</button>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-lg font-semibold">Code von der Kasse</p>
          <p className="mt-1 text-sm text-muted">Scanne den QR-Code mit deiner Handykamera – oder gib den 8-stelligen Code ein.</p>
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            inputMode="text"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            placeholder="XXXXXXXX"
            aria-label="Stempelcode"
            className="mt-5 h-16 w-full rounded-2xl border border-line bg-surface-2 text-center font-mono text-3xl font-bold tracking-[0.35em] uppercase focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
          {supported && (
            <button type="button" onClick={() => { setScanError(null); setScanning(true); }} className={buttonClass("outline", "sm", "mt-4")}>
              <ScanLine size={16} /> In der App scannen
            </button>
          )}
          {scanError && <p className="mt-3 text-sm text-danger">{scanError}</p>}
        </div>
      )}
      <ErrorBox state={state} />
      <SubmitButton className="h-13 w-full text-base">Stempel einlösen</SubmitButton>
    </form>
  );
}

function ResultView({ r, color, backHref }: { r: NonNullable<CollectResult & { ok: true }>["data"] & object; color: string; backHref: string }) {
  const icon =
    r.status === "approved" ? <CheckCircle2 size={44} className="text-success" />
    : r.status === "needs_review" ? <Clock3 size={44} className="text-warning" />
    : <XCircle size={44} className="text-danger" />;
  return (
    <div className="flex flex-col items-center rounded-[2rem] border border-line bg-surface p-8 text-center shadow-card animate-fade-up">
      <div className="animate-pop">{icon}</div>
      <h2 className="mt-4 text-2xl font-bold">
        {r.status === "approved" ? (r.reward ? "Belohnung freigeschaltet! 🎉" : "Stempel gesammelt!") : r.status === "needs_review" ? "Wird geprüft" : "Nicht bestätigt"}
      </h2>
      <p className="mt-2 max-w-sm text-muted">{r.message}</p>
      {r.status === "approved" && r.required != null && (
        <div className="mt-6">
          <StampDots progress={r.reward ? r.required : (r.progress ?? 0)} required={r.required} color={color} size="lg" />
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {r.reward ? <Link href="/rewards" className={buttonClass("primary")}>Zur Belohnung</Link> : <Link href="/cards" className={buttonClass("primary")}>Meine Stempelkarten</Link>}
        <Link href={backHref} className={buttonClass("outline")}>Zurück</Link>
      </div>
    </div>
  );
}
