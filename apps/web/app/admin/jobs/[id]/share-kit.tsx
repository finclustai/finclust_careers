"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, Link2, Loader2, Pencil, RotateCcw, Send } from "lucide-react";
import { DEFAULT_JOB_POST, buildJobPost, type PostableJob } from "@finclust/domain";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { errorText, send } from "@/lib/client-api";
import { SOURCE_LABEL } from "@/lib/status";

interface Share {
  links: { source: string; url: string; clickCount: number }[];
  template: string;
  customTemplate: boolean;
}

const FILL_INS = ["{title}", "{location}", "{experience}", "{employment}", "{openings}", "{skills}", "{about}", "{link}"];

/**
 * Nothing is sent from here (ADR-0005). The post is composed for a person to
 * paste into WhatsApp or Telegram groups, because no API can post to a group.
 *
 * The posts are built in the browser from the job's current details and the
 * template, with the same function the API uses. So they always match the job,
 * and change live while the template is being edited.
 */
export function ShareKit({
  jobUuid,
  job,
  share,
  canEdit,
}: {
  jobUuid: string;
  job: PostableJob;
  share: Share;
  canEdit: boolean;
}) {
  const [template, setTemplate] = useState(share.template);
  const [saved, setSaved] = useState(share.template);
  const [custom, setCustom] = useState(share.customTemplate);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const link = (source: string) => share.links.find((l) => l.source === source)?.url ?? "";
  const whatsapp = buildJobPost(job, link("WHATSAPP"), template);
  const telegram = buildJobPost(job, link("TELEGRAM"), template);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Clipboard is blocked in some browsers. The text stays selectable.
    }
  }

  async function save(next: string | null) {
    setBusy(true);
    setError(null);
    try {
      await send("PUT", `/jobs/${jobUuid}`, { shareMessage: next });
      const value = next ?? DEFAULT_JOB_POST;
      setTemplate(value);
      setSaved(value);
      setCustom(next !== null);
      setEditing(false);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const CopyLabel = ({ id, label }: { id: string; label: string }) =>
    copied === id ? (
      <>
        <Check size={16} strokeWidth={2.5} aria-hidden /> Copied
      </>
    ) : (
      <>
        {label === "Copy link" ? <Link2 size={16} strokeWidth={2.5} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />}
        {label}
      </>
    );

  return (
    <>
      <section className="card mt-5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold">Post for WhatsApp and Telegram</h2>
            <p className="hint">
              {custom ? "This job uses its own message." : "Using the default message."} Details and links fill in from the
              job, so they stay current when the job is edited.
            </p>
          </div>
          {canEdit && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="action">
              <Pencil size={14} strokeWidth={2.5} aria-hidden />
              Edit message
            </button>
          )}
        </div>

        {editing && (
          <div className="mt-3 rounded-[10px] border-2 border-ink bg-sand p-3">
            <label htmlFor="share-template" className="label">
              Message
            </label>
            <textarea
              id="share-template"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              rows={12}
              maxLength={4000}
              className="field font-mono !text-sm"
            />
            <p className="hint">
              Fill-ins:{" "}
              {FILL_INS.map((f) => (
                <code key={f} className="mr-1.5 font-mono">
                  {f}
                </code>
              ))}
              A line is left out when the job has no value for it. Use *stars* for bold.
            </p>
            {error && (
              <p role="alert" className="error">
                <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
                {error}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy || !template.trim()} onClick={() => save(template)} className="btn btn-primary flex-1">
                {busy && <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />}
                Save message
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setTemplate(saved);
                  setEditing(false);
                  setError(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              {custom && (
                <button type="button" disabled={busy} onClick={() => save(null)} className="btn btn-secondary">
                  <RotateCcw size={16} strokeWidth={2.5} aria-hidden />
                  Use default
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <Channel
            title="WhatsApp"
            icon={<WhatsAppIcon size={17} className="text-[#128c4b]" />}
            message={whatsapp}
            actions={
              <>
                <button type="button" onClick={() => copy(whatsapp, "wa-post")} className="btn btn-primary flex-1">
                  <CopyLabel id="wa-post" label="Copy post" />
                </button>
                <button type="button" onClick={() => copy(link("WHATSAPP"), "wa-link")} className="btn btn-secondary flex-1">
                  <CopyLabel id="wa-link" label="Copy link" />
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary w-full"
                >
                  <WhatsAppIcon size={17} className="text-[#128c4b]" />
                  Open WhatsApp
                </a>
              </>
            }
          />
          <Channel
            title="Telegram"
            icon={<Send size={16} strokeWidth={2.5} aria-hidden />}
            message={telegram}
            actions={
              <>
                <button type="button" onClick={() => copy(telegram, "tg-post")} className="btn btn-primary flex-1">
                  <CopyLabel id="tg-post" label="Copy post" />
                </button>
                <button type="button" onClick={() => copy(link("TELEGRAM"), "tg-link")} className="btn btn-secondary flex-1">
                  <CopyLabel id="tg-link" label="Copy link" />
                </button>
              </>
            }
          />
        </div>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-extrabold">Application links</h2>
        <p className="hint">One per source. Whichever a candidate uses is recorded against their application.</p>

        <ul className="mt-3 space-y-2">
          {share.links.map((l) => (
            <li key={l.source} className="flex items-center gap-2 rounded-[10px] border-2 border-ink bg-paper p-2">
              <span className="w-[74px] shrink-0 text-xs font-bold">{SOURCE_LABEL[l.source] ?? l.source}</span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-mid">{l.url}</code>
              <span className="tnum shrink-0 text-xs text-mid" title="Link opens">
                {l.clickCount}
              </span>
              <button
                type="button"
                onClick={() => copy(l.url, l.source)}
                aria-label={`Copy the ${SOURCE_LABEL[l.source] ?? l.source} link`}
                className="icon-button shrink-0 border-2 border-ink bg-sand"
              >
                {copied === l.source ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <Copy size={14} strokeWidth={2.5} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Channel({ title, icon, message, actions }: { title: string; icon: React.ReactNode; message: string; actions: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold">
        {icon}
        {title}
      </h3>
      <pre
        aria-label={`${title} post`}
        className="mt-2 max-h-72 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border-2 border-ink bg-sand p-3 font-sans text-xs leading-relaxed"
      >
        {message}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
