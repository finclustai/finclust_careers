"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, LayoutGrid, Loader2, Pause, Pencil, Play } from "lucide-react";

type JobStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED";

/**
 * The four things a recruiter comes to the jobs list to do, without opening the
 * job first. The card title still links through for everything else.
 */
export function JobCardActions({
  id,
  jobId,
  status,
}: {
  id: string;
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepting = status === "ACTIVE";

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: accepting ? "ON_HOLD" : "ACTIVE" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          Array.isArray(body.message) ? body.message[0] : (body.message ?? "Could not update the job."),
        );
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the job.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    // Built from the current origin so the copied link is always the host the
    // recruiter is actually on, whether that is localhost or the real domain.
    const url = `${window.location.origin}/apply/${jobId}?source=whatsapp`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy. Open the job to select the link manually.");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link href={`/admin/jobs/${id}/board`} className="action">
        <LayoutGrid size={14} strokeWidth={2.5} aria-hidden />
        Pipeline
      </Link>

      <button type="button" onClick={toggle} disabled={busy} className="action">
        {busy ? (
          <Loader2 size={14} strokeWidth={2.5} aria-hidden className="animate-spin" />
        ) : accepting ? (
          <Pause size={14} strokeWidth={2.5} aria-hidden />
        ) : (
          <Play size={14} strokeWidth={2.5} aria-hidden />
        )}
        {accepting ? "Pause" : "Start"}
      </button>

      <Link href={`/admin/jobs/${id}/edit`} className="action">
        <Pencil size={14} strokeWidth={2.5} aria-hidden />
        Edit
      </Link>

      <button
        type="button"
        onClick={copyLink}
        // A paused job's links tell candidates the opening has closed, so
        // offering to copy one would be handing out a dead link.
        disabled={!accepting}
        title={accepting ? "Copy the WhatsApp application link" : "Start collecting before sharing the link"}
        className="action"
      >
        {copied ? (
          <Check size={14} strokeWidth={2.5} aria-hidden />
        ) : (
          <Copy size={14} strokeWidth={2.5} aria-hidden />
        )}
        {copied ? "Copied" : "Copy link"}
      </button>

      {error && (
        <p role="alert" className="error w-full">
          {error}
        </p>
      )}
    </div>
  );
}
