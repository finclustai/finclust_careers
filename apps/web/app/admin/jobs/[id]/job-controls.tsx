"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CopyPlus, Loader2, Pause, Pencil, Play, Trash2, XCircle } from "lucide-react";
import { errorText, send } from "@/lib/client-api";

type JobStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED";

/**
 * The on/off switch for collecting applications. Only ACTIVE accepts them; every
 * other status returns "no longer accepting applications" to a candidate opening
 * the link, so toggling off takes effect immediately on links already shared.
 */
export function JobControls({ jobId, title, status }: { jobId: string; title: string; status: JobStatus }) {
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

  async function trash() {
    if (!confirm(`Move "${title}" to Trash? It stops collecting and disappears from every list. You can restore it from Trash.`)) return;
    setError(null);
    try {
      await send("DELETE", `/jobs/${jobId}`);
      router.push("/admin/jobs");
      router.refresh();
    } catch (caught) {
      setError(errorText(caught));
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

          <Link href={`/admin/jobs/new?from=${jobId}`} className="btn btn-secondary">
            <CopyPlus size={16} strokeWidth={2.5} aria-hidden />
            Clone
          </Link>

          <button type="button" onClick={trash} disabled={busy !== null} className="btn btn-secondary">
            <Trash2 size={16} strokeWidth={2.5} aria-hidden />
            Delete
          </button>
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
