"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteLocationAction, removeGalleryImageAction, setPublishedAction } from "@/app/actions/business";
import { Spinner } from "./forms";
import { buttonClass } from "./ui";

export function PublishToggle({ published }: { published: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() => start(async () => { const r = await setPublishedAction(!published); setError(r.ok ? null : r.error); })}
        className={buttonClass(published ? "outline" : "primary", "md")}
      >
        {pending && <Spinner />} {published ? "Verbergen" : "Jetzt veröffentlichen"}
      </button>
      {error && <p className="max-w-xs text-right text-sm text-danger">{error}</p>}
    </div>
  );
}

export function GalleryRemove({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => removeGalleryImageAction(id))}
      disabled={pending}
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
      aria-label="Bild entfernen"
    >
      {pending ? <Spinner /> : <Trash2 size={15} />}
    </button>
  );
}

export function LocationDelete({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => confirm("Standort löschen?") && start(async () => { await deleteLocationAction(id); })}
      disabled={pending}
      className={buttonClass("ghost", "sm", "text-danger")}
    >
      {pending ? <Spinner /> : <Trash2 size={15} />} Löschen
    </button>
  );
}
