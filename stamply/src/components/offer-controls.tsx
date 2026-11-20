"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteOfferAction, setOfferActiveAction } from "@/app/actions/business";
import { Spinner } from "./forms";
import { buttonClass } from "./ui";

export function OfferControls({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      {pending && <Spinner />}
      <button onClick={() => start(() => setOfferActiveAction(id, !active))} className={buttonClass(active ? "outline" : "soft", "sm")}>
        {active ? "Pausieren" : "Aktivieren"}
      </button>
      <button onClick={() => confirm("Aktion löschen?") && start(() => deleteOfferAction(id))} className={buttonClass("ghost", "icon", "h-9 w-9")} aria-label="Löschen">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
