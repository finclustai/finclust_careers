"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { ShareDialog } from "./share-dialog";

/** Share one candidate's CV, from their application page. */
export function ShareButton({ applicationId, name }: { applicationId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary w-full">
        <Mail size={16} strokeWidth={2.5} aria-hidden />
        Share CV by email
      </button>
      {open && <ShareDialog applications={[{ id: applicationId, name }]} onClose={() => setOpen(false)} />}
    </>
  );
}
