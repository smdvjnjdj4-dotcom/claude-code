"use client";

import { RefreshCw } from "lucide-react";
import { useActionState, useState } from "react";
import { createCodeAction, type CodeResult } from "@/app/actions/business";
import { Countdown } from "./client";
import { FormMessage, SubmitButton } from "./forms";
import { Label, Select } from "./ui";

export function CodeGenerator({ programs, locations }: { programs: { id: string; name: string }[]; locations: { id: string; name: string }[] }) {
  const [state, action] = useActionState<CodeResult | null, FormData>(createCodeAction, null);
  const [expired, setExpired] = useState(false);
  const data = state?.ok ? state.data : null;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <form action={(f) => { setExpired(false); action(f); }} className="space-y-4">
        <div>
          <Label htmlFor="programId">Treueprogramm</Label>
          <Select id="programId" name="programId" required>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        {locations.length > 1 && (
          <div>
            <Label htmlFor="locationId">Filiale</Label>
            <Select id="locationId" name="locationId">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="stamps">Anzahl Stempel</Label>
          <Select id="stamps" name="stamps" defaultValue="1">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
        <FormMessage state={state && !state.ok ? state : null} />
        <SubmitButton className="w-full">{data ? <><RefreshCw size={16} /> Neuen Code erzeugen</> : "Code erzeugen"}</SubmitButton>
        <p className="text-xs text-muted">Jeder Code ist einmalig, 3 Minuten gültig und wird serverseitig geprüft. Nur nach einem echten Einkauf vergeben.</p>
      </form>

      <div className="flex min-h-80 flex-col items-center justify-center rounded-[2rem] border border-line bg-surface-2 p-6 text-center">
        {data && !expired ? (
          <div className="animate-fade-up">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qr} alt={`QR-Code für ${data.code}`} className="mx-auto h-60 w-60 rounded-2xl bg-white p-2 shadow-card" />
            <p className="mt-4 font-mono text-3xl font-bold tracking-[0.3em]">{data.code}</p>
            <p className="mt-2 text-sm text-muted">
              {data.stamps} Stempel · gültig noch <Countdown until={data.expiresAt} onExpire={() => setExpired(true)} />
            </p>
            <p className="mt-3 text-xs text-muted">Kund:in scannt mit der Handykamera oder gibt den Code in STAMPLY ein.</p>
          </div>
        ) : (
          <p className="max-w-xs text-muted">{expired ? "Der Code ist abgelaufen. Erzeuge bei Bedarf einen neuen." : "Erzeuge einen Code und zeige ihn deiner Kundin/deinem Kunden nach dem Einkauf."}</p>
        )}
      </div>
    </div>
  );
}
