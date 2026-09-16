"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Link2, Loader2, Pencil, RotateCcw, Send } from "lucide-react";
import { buildJobPost, defaultPostFor, type ApplicationSource, type PostableJob } from "@finclust/domain";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { errorText, send } from "@/lib/client-api";
import { SOURCE_LABEL } from "@/lib/status";

export interface ShareLink {
  source: ApplicationSource;
  url: string;
  clickCount: number;
  template: string;
  customTemplate: boolean;
}

const FILL_INS = ["{title}", "{location}", "{experience}", "{employment}", "{openings}", "{skills}", "{about}", "{link}"];

const ICON: Partial<Record<ApplicationSource, React.ReactNode>> = {
  WHATSAPP: <WhatsAppIcon size={15} className="text-[#128c4b]" />,
  TELEGRAM: <Send size={14} strokeWidth={2.5} aria-hidden />,
};

// Where a channel has a share screen worth opening. The post is copied first.
const OPEN: Partial<Record<ApplicationSource, (post: string, link: string) => { label: string; href: string }>> = {
  WHATSAPP: (post) => ({ label: "Open WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(post)}` }),
  LINKEDIN: (_, link) => ({ label: "Open LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` }),
};

/**
 * Nothing is sent from here (ADR-0005). Pick a channel, see its post, copy it.
 * Each channel has its own link, so applications are counted by where they came
 * from, and its own wording. Posts are built in the browser from the job's
 * current details with the same function the API uses, so they always match
 * the job and follow edits as they are typed.
 */
export function ShareKit({ jobUuid, job, links, canEdit }: { jobUuid: string; job: PostableJob; links: ShareLink[]; canEdit: boolean }) {
  const [all, setAll] = useState(links);
  const [source, setSource] = useState<ApplicationSource>("WHATSAPP");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const current = all.find((l) => l.source === source) ?? all[0];
  const post = buildJobPost(job, current.url, draft ?? current.template);
  const open = OPEN[current.source]?.(post, current.url);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Clipboard is blocked in some browsers. The text stays selectable.
    }
  }

  function pick(next: ApplicationSource) {
    setSource(next);
    setDraft(null);
    setError(null);
  }

  async function save(message: string | null) {
    setBusy(true);
    setError(null);
    try {
      await send("PUT", `/jobs/${jobUuid}/share-message`, { source: current.source, message });
      setAll((links) =>
        links.map((l) =>
          l.source === current.source
            ? { ...l, template: message?.trim() || defaultPostFor(l.source), customTemplate: Boolean(message?.trim()) }
            : l,
        ),
      );
      setDraft(null);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const label = SOURCE_LABEL[current.source];

  return (
    <section className="card mt-5 p-4">
      <h2 className="text-sm font-extrabold">Share this job</h2>
      <p className="hint">Pick where you are posting. The job&apos;s details and that channel&apos;s own link fill in automatically.</p>

      <div role="tablist" aria-label="Channel" className="mt-3 flex flex-wrap gap-1.5">
        {all.map((l) => (
          <button
            key={l.source}
            type="button"
            role="tab"
            aria-selected={l.source === current.source}
            onClick={() => pick(l.source)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border-2 px-3 text-[13px] font-bold ${
              l.source === current.source ? "border-ink bg-orange-tint" : "border-line bg-paper hover:border-ink"
            }`}
          >
            {ICON[l.source]}
            {SOURCE_LABEL[l.source]}
            <span className="tnum font-normal text-mid" title="Link opens">
              {l.clickCount}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={`${label} post`} className="mt-3">
        {draft === null ? (
          <pre
            aria-label={`${label} post preview`}
            className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border-2 border-ink bg-sand p-3 font-sans text-sm leading-relaxed"
          >
            {post}
          </pre>
        ) : (
          <div className="rounded-[10px] border-2 border-ink bg-sand p-3">
            <label htmlFor="share-template" className="label">
              {label} message
            </label>
            <textarea
              id="share-template"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={10}
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
              A line is left out when the job has no value for it.
            </p>
            <p className="label mt-3">Preview</p>
            <pre
              aria-label={`${label} post preview`}
              className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border-2 border-line bg-paper p-3 font-sans text-sm leading-relaxed"
            >
              {post}
            </pre>
          </div>
        )}

        {error && (
          <p role="alert" className="error">
            <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
            {error}
          </p>
        )}

        {draft === null ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(post, "post")} className="btn btn-primary flex-1 basis-32">
              {copied === "post" ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <Copy size={16} strokeWidth={2.5} aria-hidden />}
              {copied === "post" ? "Copied" : "Copy post"}
            </button>
            <button type="button" onClick={() => copy(current.url, "link")} className="btn btn-secondary flex-1 basis-32">
              {copied === "link" ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <Link2 size={16} strokeWidth={2.5} aria-hidden />}
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
            {canEdit && (
              <button type="button" onClick={() => setDraft(current.template)} className="btn btn-secondary flex-1 basis-32">
                <Pencil size={16} strokeWidth={2.5} aria-hidden />
                Edit
              </button>
            )}
            {open && (
              <a href={open.href} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-1 basis-40">
                {current.source === "WHATSAPP" ? <WhatsAppIcon size={17} className="text-[#128c4b]" /> : <ExternalLink size={16} strokeWidth={2.5} aria-hidden />}
                {open.label}
              </a>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !draft.trim()} onClick={() => save(draft)} className="btn btn-primary flex-1 basis-32">
              {busy && <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />}
              Save
            </button>
            <button type="button" disabled={busy} onClick={() => setDraft(null)} className="btn btn-secondary flex-1 basis-32">
              Cancel
            </button>
            {current.customTemplate && (
              <button type="button" disabled={busy} onClick={() => save(null)} className="btn btn-secondary flex-1 basis-32">
                <RotateCcw size={16} strokeWidth={2.5} aria-hidden />
                Use default
              </button>
            )}
          </div>
        )}

        <p className="hint mt-2">
          {current.customTemplate ? `${label} uses this job's own wording.` : `${label} uses the default wording.`}{" "}
          <span className="break-all font-mono">{current.url}</span>
        </p>
      </div>
    </section>
  );
}
