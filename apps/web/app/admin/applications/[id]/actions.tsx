"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { APPLICATION_STATUSES, STATUS_STYLE, canTransition, type ApplicationStatus } from "@/lib/status";

export function StatusControl({
  applicationId,
  current,
}: {
  applicationId: string;
  current: ApplicationStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only legal destinations are offered. The API validates the same rule.
  const legal = APPLICATION_STATUSES.filter((s) => canTransition(current, s));

  async function move(to: ApplicationStatus) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "That move could not be saved.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That move could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (legal.length === 0) {
    return <p className="hint">This application has reached a final stage.</p>;
  }

  return (
    <div>
      <p className="label">Move to</p>
      <div className="flex flex-wrap gap-2">
        {legal.map((status) => (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={() => move(status)}
            className={`chip chip-button ${STATUS_STYLE[status].chip}`}
          >
            <span className={`size-2 rounded-full ${STATUS_STYLE[status].dot}`} aria-hidden />
            {STATUS_STYLE[status].label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
