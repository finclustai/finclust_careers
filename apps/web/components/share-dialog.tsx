"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Mail, X } from "lucide-react";
import { errorText, send } from "@/lib/client-api";

interface Setup {
  enabled: boolean;
  mailbox: string | null;
  recipients: string[];
}

/**
 * Collects who the CVs go to, then has the API create a draft in the company
 * Zoho mailbox with the CVs attached (ADR-0012). Nothing is sent from here: the
 * draft is reviewed and sent in Zoho Mail.
 */
export function ShareDialog({
  applications,
  onClose,
}: {
  applications: { id: string; name: string }[];
  onClose: (shared: boolean) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ draftsUrl: string; moved: number } | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    send<Setup>("GET", "/shares/setup").then(setSetup, (caught) => setError(errorText(caught)));
  }, []);

  function close() {
    dialog.current?.close();
    if (done) router.refresh();
    onClose(Boolean(done));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setDone(await send("POST", "/shares", { applicationIds: applications.map((a) => a.id), to, cc }));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const count = applications.length;

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
      aria-labelledby="share-title"
      className="m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-[20px] border-2 border-ink bg-paper p-0 text-ink shadow-[0_6px_0_var(--color-ink)] backdrop:bg-ink/40"
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-4 py-3">
        <h2 id="share-title" className="flex items-center gap-2 text-base font-extrabold">
          <Mail size={18} strokeWidth={2.5} aria-hidden />
          Share {count} CV{count === 1 ? "" : "s"} by email
        </h2>
        <button type="button" onClick={close} disabled={busy} aria-label="Close" className="icon-button">
          <X size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      {done ? (
        <div className="p-4">
          <p className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={18} strokeWidth={2.5} aria-hidden className="mt-0.5 shrink-0 text-green" />
            <span>
              A draft with {count} CV{count === 1 ? "" : "s"} attached is ready in <strong>{setup?.mailbox ?? "Zoho Mail"}</strong>.
              Review it, then press Send in Zoho.
              {done.moved > 0 && ` ${done.moved} moved to Sent to client.`}
            </span>
          </p>
          <a href={done.draftsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4 w-full">
            <ExternalLink size={17} strokeWidth={2.5} aria-hidden />
            Open drafts in Zoho Mail
          </a>
          <button type="button" onClick={close} className="btn btn-secondary mt-2 w-full">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="p-4">
          <ul className="flex flex-wrap gap-1.5">
            {applications.map((a) => (
              <li key={a.id} className="chip bg-sand">
                {a.name}
              </li>
            ))}
          </ul>

          {setup && !setup.enabled ? (
            <p className="error mt-4">
              <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
              Email sharing is not connected to Zoho yet.
            </p>
          ) : (
            <>
              <label htmlFor="share-to" className="label mt-4">
                To
              </label>
              <input
                id="share-to"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                list="share-recipients"
                type="text"
                inputMode="email"
                autoComplete="off"
                autoFocus
                required
                placeholder="hr@client.com"
                className="field"
              />
              <span className="hint block">Separate several addresses with commas.</span>

              <label htmlFor="share-cc" className="label mt-3">
                CC <span className="font-normal text-mid">(optional)</span>
              </label>
              <input
                id="share-cc"
                value={cc}
                onChange={(event) => setCc(event.target.value)}
                list="share-recipients"
                type="text"
                inputMode="email"
                autoComplete="off"
                className="field"
              />
              <datalist id="share-recipients">
                {setup?.recipients.map((r) => <option key={r} value={r} />)}
              </datalist>

              <p className="hint mt-3">
                The CVs are attached and the email is filled in from your template. It opens as a draft in{" "}
                <strong>{setup?.mailbox ?? "Zoho Mail"}</strong>, so you can change anything before sending.
              </p>
            </>
          )}

          {error && (
            <p role="alert" className="error mt-3">
              <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !setup?.enabled || !to.trim()} className="btn btn-primary mt-4 w-full">
            {busy ? (
              <>
                <Loader2 size={17} strokeWidth={2.5} aria-hidden className="animate-spin" />
                Attaching CVs…
              </>
            ) : (
              "Create draft in Zoho Mail"
            )}
          </button>
        </form>
      )}
    </dialog>
  );
}
