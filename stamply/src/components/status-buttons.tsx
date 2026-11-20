"use client";

import { Archive, Pause, Play } from "lucide-react";
import { useState, useTransition } from "react";
import { campaignStatusAction, setProgramStatusAction } from "@/app/actions/business";
import { Spinner } from "./forms";
import { buttonClass } from "./ui";

export function ProgramStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (s: "active" | "paused" | "archived") =>
    start(async () => {
      if (s === "archived" && !confirm("Programm archivieren? Kund:innen können dann keine Stempel mehr sammeln.")) return;
      const r = await setProgramStatusAction(id, s);
      setError(r.ok ? null : r.error);
    });
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {pending && <Spinner className="self-center" />}
        {status !== "active" && status !== "archived" && <button onClick={() => run("active")} className={buttonClass("primary", "sm")}><Play size={15} /> Aktivieren</button>}
        {status === "active" && <button onClick={() => run("paused")} className={buttonClass("outline", "sm")}><Pause size={15} /> Pausieren</button>}
        {status !== "archived" && <button onClick={() => run("archived")} className={buttonClass("ghost", "sm")}><Archive size={15} /> Archivieren</button>}
      </div>
      {error && <p className="max-w-xs text-right text-sm text-danger">{error}</p>}
    </div>
  );
}

export function CampaignStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (a: "activate" | "pause" | "archive") =>
    start(async () => {
      if (a === "archive" && !confirm("Kampagne löschen? Das Versandprotokoll bleibt erhalten.")) return;
      const r = await campaignStatusAction(id, a);
      setError(r.ok ? null : r.error);
    });
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {pending && <Spinner className="self-center" />}
        {["draft", "paused"].includes(status) && <button onClick={() => run("activate")} className={buttonClass("soft", "sm")}><Play size={14} /> Aktivieren</button>}
        {["active", "scheduled"].includes(status) && <button onClick={() => run("pause")} className={buttonClass("outline", "sm")}><Pause size={14} /> Pausieren</button>}
        {status !== "sent" && <button onClick={() => run("archive")} className={buttonClass("ghost", "sm")} aria-label="Löschen"><Archive size={14} /></button>}
      </div>
      {error && <p className="max-w-xs text-right text-xs text-danger">{error}</p>}
    </div>
  );
}
