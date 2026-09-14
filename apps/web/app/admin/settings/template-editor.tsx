"use client";

import { useState } from "react";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { DEFAULT_SHARE_TEMPLATE, buildShareEmail } from "@finclust/domain";
import { errorText, send } from "@/lib/client-api";

const SAMPLE_JOB = { jobId: "BAX-EBS-01", title: "EBS R12 Functional" };
const SAMPLE_CANDIDATES = [
  { name: "Sample Candidate", totalExperience: "8", location: "Hyderabad", noticePeriod: "30 days", expectedSalary: null },
  { name: "Second Candidate", totalExperience: "5", location: "Pune", noticePeriod: null, expectedSalary: null },
];

export function TemplateEditor({ initial, senderName }: { initial: { subject: string; body: string }; senderName: string }) {
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Built by the same function the API uses, so this is exactly what lands in Zoho.
  const preview = buildShareEmail({ subject, body }, SAMPLE_JOB, SAMPLE_CANDIDATES, senderName);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await send("PUT", "/shares/template", { subject, body });
      setSaved(true);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-4 p-4">
      <h2 className="text-sm font-extrabold">CV share email</h2>
      <p className="hint">
        The starting point for every draft. You can still change each email in Zoho before sending. These fill in by
        themselves: <code className="font-mono">{"{job_title}"}</code> <code className="font-mono">{"{job_id}"}</code>{" "}
        <code className="font-mono">{"{count}"}</code> <code className="font-mono">{"{sender_name}"}</code>, and{" "}
        <code className="font-mono">{"{candidates}"}</code> on its own line becomes the candidate table.
      </p>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <form onSubmit={save}>
          <label htmlFor="template-subject" className="label">
            Subject
          </label>
          <input
            id="template-subject"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setSaved(false);
            }}
            maxLength={300}
            className="field"
          />
          <label htmlFor="template-body" className="label mt-3">
            Message
          </label>
          <textarea
            id="template-body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setSaved(false);
            }}
            maxLength={5000}
            rows={14}
            className="field font-mono !text-sm"
          />
          <span className="hint block">Leave a blank line between paragraphs.</span>

          {error && (
            <p role="alert" className="error">
              <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary flex-1">
              {busy && <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />}
              {saved ? "Saved" : "Save template"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject(DEFAULT_SHARE_TEMPLATE.subject);
                setBody(DEFAULT_SHARE_TEMPLATE.body);
                setSaved(false);
              }}
              className="btn btn-secondary"
            >
              <RotateCcw size={16} strokeWidth={2.5} aria-hidden />
              Default
            </button>
          </div>
        </form>

        <div>
          <p className="label">Preview with sample candidates</p>
          <div className="rounded-[10px] border-2 border-ink bg-shell p-3 text-sm">
            <p className="border-b-2 border-line pb-2 font-bold">{preview.subject}</p>
            {/* Safe to render: buildShareEmail escapes everything it did not write itself. */}
            <div
              className="overflow-x-auto pt-2 [&_p]:my-2 [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
