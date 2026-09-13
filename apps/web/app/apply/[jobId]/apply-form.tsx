"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, FileText, Loader2, Upload, X } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;

type UploadState =
  | { phase: "empty" }
  | { phase: "uploading"; fileName: string }
  | { phase: "done"; fileName: string; path: string }
  | { phase: "failed"; fileName: string; message: string };

type Errors = Partial<Record<"fullName" | "phone" | "email" | "resume" | "form", string>>;

export function ApplyForm({ jobId, source }: { jobId: string; source?: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [upload, setUpload] = useState<UploadState>({ phase: "empty" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  /**
   * Upload begins the moment a file is chosen, while the candidate is still
   * filling in the rest. Bytes go straight to storage, never through our API
   * (ADR-0003), so submission is near-instant on a slow mobile connection.
   */
  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      setUpload({ phase: "failed", fileName: file.name, message: "Only PDF files are accepted." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setUpload({
        phase: "failed",
        fileName: file.name,
        message: `That file is ${(file.size / 1048576).toFixed(1)}MB. The limit is 10MB.`,
      });
      return;
    }

    setErrors((e) => ({ ...e, resume: undefined }));
    setUpload({ phase: "uploading", fileName: file.name });

    try {
      const ticket = await fetch(`/api/apply/${jobId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      if (!ticket.ok) throw new Error("Could not start the upload.");
      const { path, signedUrl } = await ticket.json();

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!put.ok) throw new Error("The upload did not complete.");

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

    if (fullName.length < 2) next.fullName = "Enter your full name.";
    if (phone.length < 10) next.phone = "Enter your mobile number.";
    if (upload.phase !== "done") next.resume = "Attach your CV as a PDF before submitting.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Focus the first field in error so a keyboard or screen reader user is
      // taken to the problem rather than left to hunt for it.
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const experience = String(data.get("totalExperience") ?? "").trim();
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
            resumePath: upload.phase === "done" ? upload.path : "",
            resumeFileName: upload.phase === "done" ? upload.fileName : "",
            email: optional("email"),
            location: optional("location"),
            totalExperience: experience === "" ? undefined : Number(experience),
            currentCompany: optional("currentCompany"),
            noticePeriod: optional("noticePeriod"),
            expectedSalary: optional("expectedSalary"),
            linkedinUrl: optional("linkedinUrl"),
            whatsappOptIn: data.get("whatsappOptIn") === "on",
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

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-5 sm:p-6">
      <h2 className="text-xl font-extrabold">Apply for this role</h2>
      <p className="hint">Takes about a minute. Fields marked * are required.</p>

      <div className="mt-5 space-y-5">
        <Field
          name="fullName"
          label="Full name"
          required
          autoComplete="name"
          error={errors.fullName}
          onInput={() => setErrors((e) => ({ ...e, fullName: undefined }))}
        />

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
          onInput={() => setErrors((e) => ({ ...e, phone: undefined }))}
        />

        <ResumeField
          state={upload}
          error={errors.resume}
          inputRef={fileInput}
          onPick={handleFile}
          onClear={clearFile}
        />

        <div>
          <button
            type="button"
            onClick={() => setShowOptional((open) => !open)}
            aria-expanded={showOptional}
            className="flex w-full items-center justify-between rounded-[10px] border-2 border-ink bg-sand px-3 py-3 text-left text-sm font-bold"
          >
            Add more detail (optional)
            <ChevronDown
              size={18}
              strokeWidth={2}
              aria-hidden
              className={showOptional ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>

          {showOptional && (
            <div className="mt-4 space-y-5">
              <Field name="email" label="Email" type="email" autoComplete="email" />
              <Field name="location" label="Current location" autoComplete="address-level2" />
              <Field
                name="totalExperience"
                label="Total experience (years)"
                type="number"
                inputMode="decimal"
                min="0"
                max="60"
                step="0.5"
              />
              <Field name="currentCompany" label="Current company" autoComplete="organization" />
              <Field name="noticePeriod" label="Notice period" placeholder="30 days" />
              <Field name="expectedSalary" label="Expected salary" placeholder="18 LPA" />
              <Field
                name="linkedinUrl"
                label="LinkedIn profile"
                type="url"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          )}
        </div>

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] border-2 border-ink bg-sand p-3.5">
          <input
            type="checkbox"
            name="whatsappOptIn"
            className="mt-0.5 size-6 shrink-0 accent-[#ff8a1e]"
          />
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

      <button
        type="submit"
        disabled={submitting || upload.phase === "uploading"}
        className="btn btn-primary mt-6 w-full"
      >
        {submitting ? (
          <>
            <Loader2 size={18} strokeWidth={2.5} aria-hidden className="animate-spin" />
            Submitting…
          </>
        ) : upload.phase === "uploading" ? (
          "Waiting for your CV to finish uploading…"
        ) : (
          "Submit application"
        )}
      </button>

      <p className="hint mt-4">
        By applying you agree that FINCLUST may store your CV and contact details to consider you
        for this and future roles.
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
        Your CV<span className="text-[#c11a12]"> *</span>
      </label>

      {/* Stated before the picker opens, not after a rejected file. */}
      <p className="hint mb-2 mt-0">PDF only, up to 10MB. Export from Word as PDF if needed.</p>

      <input
        ref={inputRef}
        id="resume"
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-invalid={message ? "true" : undefined}
        aria-describedby={message ? "resume-error" : undefined}
        onChange={(event) => onPick(event.target.files?.[0])}
      />

      {state.phase === "done" ? (
        <div className="flex items-center gap-3 rounded-[10px] border-2 border-ink bg-green-tint p-3">
          <CheckCircle2 size={20} strokeWidth={2} aria-hidden className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{state.fileName}</span>
          <button
            type="button"
            onClick={onClear}
            className="flex size-11 shrink-0 items-center justify-center rounded-[8px]"
            aria-label={`Remove ${state.fileName}`}
          >
            <X size={18} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={state.phase === "uploading"}
          className="btn btn-secondary w-full"
        >
          {state.phase === "uploading" ? (
            <>
              <Loader2 size={18} strokeWidth={2.5} aria-hidden className="animate-spin" />
              Uploading {state.fileName}…
            </>
          ) : (
            <>
              {failed ? <Upload size={18} strokeWidth={2.5} aria-hidden /> : <FileText size={18} strokeWidth={2.5} aria-hidden />}
              {failed ? "Choose a different file" : "Choose PDF"}
            </>
          )}
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
