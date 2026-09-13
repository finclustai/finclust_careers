"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Pause, Pencil, Play, XCircle } from "lucide-react";

type JobStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED";

/**
 * The on/off switch for collecting applications. Only ACTIVE accepts them; every
 * other status returns "no longer accepting applications" to a candidate opening
 * the link, so toggling off takes effect immediately on links already shared.
 */
export function JobControls({ jobId, status }: { jobId: string; status: JobStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: JobStatus) {
    if (next === "CLOSED" && !confirm("Close this job? Candidates opening its links will be told it is no longer accepting applications.")) {
      return;
    }

    setBusy(next);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          Array.isArray(body.message) ? body.message[0] : (body.message ?? "Could not change the status."),
        );
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change the status.");
    } finally {
      setBusy(null);
    }
  }

  const accepting = status === "ACTIVE";

  return (
    <div className="card mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">
            {accepting ? "Accepting applications" : "Not accepting applications"}
          </p>
          <p className="hint">
            {accepting
              ? "Anyone opening this job's links can apply right now."
              : "Links still resolve, but candidates are told the opening has closed."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/jobs/${jobId}/edit`} className="btn btn-secondary">
            <Pencil size={16} strokeWidth={2.5} aria-hidden />
            Edit
          </Link>

          {accepting ? (
            <button
              type="button"
              onClick={() => setStatus("ON_HOLD")}
              disabled={busy !== null}
              className="btn btn-secondary"
            >
              {busy === "ON_HOLD" ? (
                <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />
              ) : (
                <Pause size={16} strokeWidth={2.5} aria-hidden />
              )}
              Stop collecting
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStatus("ACTIVE")}
              disabled={busy !== null}
              className="btn btn-primary"
            >
              {busy === "ACTIVE" ? (
                <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />
              ) : (
                <Play size={16} strokeWidth={2.5} aria-hidden />
              )}
              Start collecting
            </button>
          )}

          {status !== "CLOSED" && (
            <button
              type="button"
              onClick={() => setStatus("CLOSED")}
              disabled={busy !== null}
              className="btn btn-secondary"
            >
              <XCircle size={16} strokeWidth={2.5} aria-hidden />
              Close
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="error mt-3">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
