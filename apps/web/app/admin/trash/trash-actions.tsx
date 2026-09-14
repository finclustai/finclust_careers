"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import { errorText, send } from "@/lib/client-api";

export function TrashActions({
  kind,
  id,
  label,
  eraseWarning,
}: {
  kind: "jobs" | "candidates";
  id: string;
  label: string;
  eraseWarning: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(method: string, path: string) {
    setBusy(true);
    setError(null);
    try {
      await send(method, path);
      router.refresh();
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => run("POST", `/${kind}/${id}/restore`)} className="action">
        <RotateCcw size={14} strokeWidth={2.5} aria-hidden />
        Restore
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (confirm(`Delete ${label} permanently?\n\n${eraseWarning}`)) void run("DELETE", `/${kind}/${id}/permanent`);
        }}
        className="action !border-red text-[#c11a12]"
      >
        <Trash2 size={14} strokeWidth={2.5} aria-hidden />
        Delete forever
      </button>
      {error && (
        <p role="alert" className="error w-full">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
