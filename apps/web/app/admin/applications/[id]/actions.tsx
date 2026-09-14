"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { errorText, send } from "@/lib/client-api";
import { APPLICATION_STATUSES, STATUS_STYLE, canTransition, type ApplicationStatus } from "@/lib/status";

// Moves where the reason is worth recording for whoever looks next.
const ASK_REASON: ApplicationStatus[] = ["REJECTED", "ON_HOLD"];

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="error">
      <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
      {message}
    </p>
  );
}

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
  const [pending, setPending] = useState<ApplicationStatus | null>(null);
  const [reason, setReason] = useState("");

  const legal = APPLICATION_STATUSES.filter((s) => canTransition(current, s));

  async function move(to: ApplicationStatus, comment?: string) {
    setBusy(true);
    setError(null);
    try {
      await send("PUT", `/applications/${applicationId}/status`, { status: to, comment: comment || undefined });
      setPending(null);
      setReason("");
      router.refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
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
            aria-pressed={pending === status}
            onClick={() => (ASK_REASON.includes(status) ? setPending(status) : move(status))}
            className={`chip chip-button ${STATUS_STYLE[status].chip} ${pending === status ? "ring-4 ring-orange-tint" : ""}`}
          >
            <span className={`size-2 rounded-full ${STATUS_STYLE[status].dot}`} aria-hidden />
            {STATUS_STYLE[status].label}
          </button>
        ))}
      </div>

      {pending && (
        <form
          className="mt-3 rounded-[10px] border-2 border-ink bg-sand p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void move(pending, reason.trim());
          }}
        >
          <label htmlFor="reason" className="label">
            Reason for {STATUS_STYLE[pending].label.toLowerCase()} <span className="font-normal text-mid">(optional)</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={2}
            autoFocus
            placeholder={pending === "REJECTED" ? "e.g. Not enough R12 experience" : "e.g. Waiting for client feedback"}
            className="field"
          />
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary flex-1">
              {busy && <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />}
              Move to {STATUS_STYLE[pending].label}
            </button>
            <button type="button" onClick={() => setPending(null)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}
      <ErrorLine message={error} />
    </div>
  );
}

/** Prev/Next through the same job, also on J and K like a mail client. */
export function StepNav({ previousId, nextId }: { previousId: string | null; nextId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.metaKey || event.ctrlKey || event.altKey || target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "j" && nextId) router.push(`/admin/applications/${nextId}`);
      if (event.key === "k" && previousId) router.push(`/admin/applications/${previousId}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previousId, nextId, router]);

  const step = (id: string | null, label: string, key: string, icon: React.ReactNode) =>
    id ? (
      <Link href={`/admin/applications/${id}`} className="action" title={`${label} (${key})`}>
        {icon}
        {label}
      </Link>
    ) : (
      <span className="action opacity-40" aria-disabled>
        {icon}
        {label}
      </span>
    );

  return (
    <div className="flex gap-2">
      {step(previousId, "Newer", "K", <ChevronLeft size={14} strokeWidth={2.5} aria-hidden />)}
      {step(nextId, "Older", "J", <ChevronRight size={14} strokeWidth={2.5} aria-hidden />)}
    </div>
  );
}

interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string };
}

export function Notes({ applicationId, initial }: { applicationId: string; initial: Note[] }) {
  const [notes, setNotes] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const note = await send<Note>("POST", `/applications/${applicationId}/notes`, { body });
      setNotes((all) => [note, ...all]);
      setBody("");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-extrabold">Team notes</h2>
      <p className="hint">Only your team sees these. They follow the candidate to every job they apply for.</p>
      <form onSubmit={add} className="mt-3">
        <label htmlFor="note" className="sr-only">
          Add a note
        </label>
        <textarea
          id="note"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={2}
          placeholder="e.g. Spoke on phone, strong on AP/AR, 30 days notice"
          className="field"
        />
        <button type="submit" disabled={busy || !body.trim()} className="btn btn-secondary mt-2 w-full">
          {busy && <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />}
          Add note
        </button>
      </form>
      <ErrorLine message={error} />
      {notes.length > 0 && (
        <ol className="mt-3 space-y-2.5">
          {notes.map((note) => (
            <li key={note.id} className="rounded-[10px] border-2 border-line bg-shell p-2.5">
              <p className="whitespace-pre-line break-words text-sm">{note.body}</p>
              <p className="mt-1 text-xs text-mid">
                {note.author.name} ·{" "}
                {new Date(note.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AssignControl({
  applicationId,
  current,
  people,
}: {
  applicationId: string;
  current: string | null;
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    const previous = value;
    setValue(next);
    setError(null);
    try {
      await send("PUT", `/applications/${applicationId}/assignee`, { recruiterId: next || null });
      router.refresh();
    } catch (caught) {
      setValue(previous);
      setError(errorText(caught));
    }
  }

  return (
    <div className="mt-3">
      <label htmlFor="assignee" className="label">
        Assigned to
      </label>
      <select id="assignee" value={value} onChange={(event) => change(event.target.value)} className="field">
        <option value="">Nobody yet</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      <p className="hint">A recruiter only sees applications assigned to them.</p>
      <ErrorLine message={error} />
    </div>
  );
}

export function DeleteCandidate({
  candidateId,
  name,
  applicationCount,
}: {
  candidateId: string;
  name: string;
  applicationCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function trash() {
    const scope = applicationCount > 1 ? ` and all ${applicationCount} of their applications` : "";
    if (!confirm(`Move ${name}${scope} to Trash? You can restore them from Trash.`)) return;
    try {
      await send("DELETE", `/candidates/${candidateId}`);
      router.push("/admin/applications");
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <>
      <button type="button" onClick={trash} className="btn btn-secondary w-full">
        <Trash2 size={16} strokeWidth={2.5} aria-hidden />
        Delete candidate
      </button>
      <ErrorLine message={error} />
    </>
  );
}
