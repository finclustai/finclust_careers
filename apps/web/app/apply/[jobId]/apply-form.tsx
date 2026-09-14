"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, FileText, Loader2, Upload, X } from "lucide-react";
import { CV_ACCEPT, CV_MIME, cvTypeFromName } from "@finclust/domain";

const MAX_BYTES = 10 * 1024 * 1024;
const NOTE_MAX = 2000;

type UploadState =
  | { phase: "empty" }
  | { phase: "uploading"; fileName: string; percent: number }
  | { phase: "done"; fileName: string; path: string }
  | { phase: "failed"; fileName: string; message: string };

type Errors = Partial<
  Record<"fullName" | "phone" | "location" | "totalExperience" | "resume" | "form", string>
>;

/**
 * PUT with progress. fetch() cannot report upload progress, and a 10 MB CV on
 * slow mobile data with only a spinner looks frozen, so this uses XHR.
 */
function putWithProgress(url: string, file: File, contentType: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("The upload did not complete.")));
    xhr.onerror = () => reject(new Error("The upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}

export function ApplyForm({
  jobId,
  source,
  noteEnabled,
}: {
  jobId: string;
  source?: string;
  noteEnabled: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [upload, setUpload] = useState<UploadState>({ phase: "empty" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [note, setNote] = useState("");

  /**
   * Upload begins the moment a file is chosen, while the candidate is still
   * filling in the rest. Bytes go straight to storage, never through our API
   * (ADR-0003), so submission is near-instant on a slow connection.
   */
  async function handleFile(file: File | undefined) {
    if (!file) return;

    const type = cvTypeFromName(file.name);
    if (!type) {
      setUpload({
        phase: "failed",
        fileName: file.name,
        message: "Upload your CV as a PDF or Word file (.pdf, .doc or .docx).",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      setUpload({
        phase: "failed",
        fileName: file.name,
        message: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`,
      });
      return;
    }

    setErrors((e) => ({ ...e, resume: undefined }));
    setUpload({ phase: "uploading", fileName: file.name, percent: 0 });

    try {
      const ticket = await fetch(`/api/apply/${jobId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      if (!ticket.ok) {
        const body = await ticket.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not start the upload.");
      }
      const { path, signedUrl } = await ticket.json();

      // Declare the type the file's extension claims. The server still checks
      // the real bytes before the application is saved.
      await putWithProgress(signedUrl, file, CV_MIME[type], (percent) =>
        setUpload({ phase: "uploading", fileName: file.name, percent }),
      );

      setUpload({ phase: "done", fileName: file.name, path });
    } catch (error) {
      setUpload({
        phase: "failed",
        fileName: file.name,
        message: error instanceof Error ? error.message : "The upload failed.",
      });
    }
  }

  function clearFile() {
    setUpload({ phase: "empty" });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const next: Errors = {};
    const fullName = String(data.get("fullName") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();
    const experience = String(data.get("totalExperience") ?? "").trim();

    if (fullName.length < 2) next.fullName = "Enter your full name.";
    if (phone.length < 10) next.phone = "Enter your mobile number.";
    if (location.length < 2) next.location = "Enter your current city.";
    if (experience === "") next.totalExperience = "Enter your total experience. Use 0 if you are a fresher.";
    if (upload.phase !== "done") next.resume = "Attach your CV before submitting.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Focus the first field in error so a keyboard or screen reader user is
      // taken to the problem rather than left to hunt for it.
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const optional = (key: string) => {
        const value = String(data.get(key) ?? "").trim();
        return value === "" ? undefined : value;
      };

      const response = await fetch(
        `/api/apply/${jobId}${source ? `?source=${encodeURIComponent(source)}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            phone,
            location,
            totalExperience: Number(experience),
            resumePath: upload.phase === "done" ? upload.path : "",
            resumeFileName: upload.phase === "done" ? upload.fileName : "",
            email: optional("email"),
            currentCompany: optional("currentCompany"),
            noticePeriod: optional("noticePeriod"),
            expectedSalary: optional("expectedSalary"),
            linkedinUrl: optional("linkedinUrl"),
            whatsappOptIn: data.get("whatsappOptIn") === "on",
            ...(noteEnabled && note.trim() ? { candidateNote: note.trim() } : {}),
          }),
        },
      );

      const body = await response.json();
      if (!response.ok) {
        const message = Array.isArray(body.message) ? body.message[0] : body.message;
        setErrors({ form: message ?? "Something went wrong. Try again." });
        setSubmitting(false);
        return;
      }

      const query = new URLSearchParams({
        ref: body.applicationReference,
        title: body.jobTitle,
        ...(body.alreadyApplied ? { again: "1" } : {}),
      });
      router.push(`/apply/${jobId}/success?${query}`);
    } catch {
      setErrors({ form: "Could not reach the server. Check your connection and try again." });
      setSubmitting(false);
    }
  }

  const clear = (key: keyof Errors) => () => setErrors((e) => ({ ...e, [key]: undefined }));

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-5 sm:p-6">
      <h2 className="text-xl font-extrabold">Apply for this role</h2>
      <p className="hint">Takes about a minute. Fields marked * are required.</p>

      <div className="mt-5 space-y-5">
        <Field name="fullName" label="Full name" required autoComplete="name" error={errors.fullName} onInput={clear("fullName")} />

        <Field
          name="phone"
          label="Mobile number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          hint="We use this to contact you about the role."
          error={errors.phone}
          onInput={clear("phone")}
        />

        {/* Asked up front: recruiters shortlist on these two first, and leaving
            them optional meant most applications arrived without them. */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="location"
            label="Current city"
            required
            autoComplete="address-level2"
            placeholder="Bengaluru"
            error={errors.location}
            onInput={clear("location")}
          />
          <Field
            name="totalExperience"
            label="Total experience (years)"
            required
            type="number"
            inputMode="decimal"
            min="0"
            max="60"
            step="0.5"
            placeholder="0 if fresher"
            error={errors.totalExperience}
            onInput={clear("totalExperience")}
          />
        </div>

        {noteEnabled && (
          <div>
            <label htmlFor="candidateNote" className="label">
              Note for the recruiter <span className="font-normal text-mid">(optional)</span>
            </label>
            <textarea
              id="candidateNote"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX))}
              rows={4}
              className="field"
              placeholder="Anything worth knowing: notice period, availability, why this role…"
              aria-describedby="candidateNote-count"
            />
            <p id="candidateNote-count" className="hint tnum text-right">
              {note.length} / {NOTE_MAX}
            </p>
          </div>
        )}

        <ResumeField state={upload} error={errors.resume} inputRef={fileInput} onPick={handleFile} onClear={clearFile} />

        <div>
          <button
            type="button"
            onClick={() => setShowOptional((open) => !open)}
            aria-expanded={showOptional}
            className="flex min-h-[48px] w-full items-center justify-between rounded-[10px] border-2 border-ink bg-sand px-3 text-left text-sm font-bold"
          >
            Add more detail (optional)
            <ChevronDown size={18} strokeWidth={2} aria-hidden className={showOptional ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>

          {showOptional && (
            <div className="mt-4 space-y-5">
              <Field name="email" label="Email" type="email" autoComplete="email" />
              <Field name="currentCompany" label="Current company" autoComplete="organization" />
              <Field name="noticePeriod" label="Notice period" placeholder="30 days" />
              <Field name="expectedSalary" label="Expected salary" placeholder="18 LPA" />
              <Field name="linkedinUrl" label="LinkedIn profile" type="url" placeholder="https://linkedin.com/in/..." />
            </div>
          )}
        </div>

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] border-2 border-ink bg-sand p-3.5">
          <input type="checkbox" name="whatsappOptIn" className="mt-0.5 size-6 shrink-0 accent-[#ff8a1e]" />
          <span className="text-sm">
            Send me future openings that match my profile on WhatsApp.
            <span className="hint block">Optional. You can ask us to stop at any time.</span>
          </span>
        </label>
      </div>

      {errors.form && (
        <p role="alert" className="error mt-5">
          <AlertCircle size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {errors.form}
        </p>
      )}

      <button type="submit" disabled={submitting || upload.phase === "uploading"} className="btn btn-primary mt-6 w-full">
        {submitting ? (
          <>
            <Loader2 size={18} strokeWidth={2.5} aria-hidden className="animate-spin" />
            Submitting…
          </>
        ) : upload.phase === "uploading" ? (
          `Uploading your CV… ${upload.percent}%`
        ) : (
          "Submit application"
        )}
      </button>

      <p className="hint mt-4">
        By applying you agree that FINCLUST may store your CV and contact details to consider you for
        this and future roles. See our{" "}
        <Link href="/privacy" className="font-semibold text-ink underline decoration-orange decoration-2 underline-offset-2">
          privacy notice
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  hint,
  error,
  ...input
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
        {required && <span className="text-[#c11a12]"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        className="field"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...input}
      />
      {error ? (
        <p id={errorId} role="alert" className="error">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function ResumeField({
  state,
  error,
  inputRef,
  onPick,
  onClear,
}: {
  state: UploadState;
  error?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const failed = state.phase === "failed";
  const message = failed ? state.message : error;

  return (
    <div>
      <label htmlFor="resume" className="label">
        Your CV / Resume<span className="text-[#c11a12]"> *</span>
      </label>

      {/* Stated before the picker opens, not after a rejected file. */}
      <p className="hint mb-2 mt-0">PDF or Word (.pdf, .doc, .docx), up to 10 MB.</p>

      <input
        ref={inputRef}
        id="resume"
        type="file"
        accept={CV_ACCEPT}
        className="sr-only"
        aria-invalid={message ? "true" : undefined}
        aria-describedby={message ? "resume-error" : undefined}
        onChange={(event) => onPick(event.target.files?.[0])}
      />

      {state.phase === "done" ? (
        <div className="flex items-center gap-3 rounded-[10px] border-2 border-ink bg-green-tint p-3">
          <CheckCircle2 size={20} strokeWidth={2} aria-hidden className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{state.fileName}</span>
          <button type="button" onClick={onClear} className="icon-button shrink-0" aria-label={`Remove ${state.fileName}`}>
            <X size={18} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      ) : state.phase === "uploading" ? (
        <div className="rounded-[10px] border-2 border-ink bg-paper p-3" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin shrink-0" />
            <span className="min-w-0 flex-1 truncate">{state.fileName}</span>
            <span className="tnum shrink-0">{state.percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Uploading ${state.fileName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.percent}
            className="mt-2 h-2.5 overflow-hidden rounded-full border border-ink bg-sand"
          >
            {/* transform, not width, so the bar animates without layout reflow */}
            <div
              className="h-full origin-left bg-orange transition-transform duration-200 ease-out"
              style={{ transform: `scaleX(${state.percent / 100})` }}
            />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-secondary w-full">
          {failed ? <Upload size={18} strokeWidth={2.5} aria-hidden /> : <FileText size={18} strokeWidth={2.5} aria-hidden />}
          {failed ? "Choose a different file" : "Choose CV / Resume"}
        </button>
      )}

      {message && (
        <p id="resume-error" role="alert" className="error">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
