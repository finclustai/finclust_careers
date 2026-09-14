"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, CircleDot, Loader2, XCircle } from "lucide-react";

interface StatusResult {
  applicationReference: string;
  jobTitle: string;
  appliedAt: string;
  label: string;
  detail: string;
  tone: "neutral" | "positive" | "closed";
}

const TONE = {
  neutral: { icon: CircleDot, surface: "bg-sand" },
  positive: { icon: CheckCircle2, surface: "bg-green-tint" },
  closed: { icon: XCircle, surface: "bg-paper" },
} as const;

export function StatusLookup() {
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/public/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: String(data.get("reference") ?? "").trim(),
          phone: String(data.get("phone") ?? "").trim(),
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 429) {
        setError("Too many attempts. Wait a minute and try again.");
      } else if (!response.ok) {
        setError(Array.isArray(body.message) ? body.message[0] : (body.message ?? "Could not check that application."));
      } else {
        setResult(body);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const tone = result ? TONE[result.tone] : null;
  const ToneIcon = tone?.icon;

  return (
    <>
      <form onSubmit={handleSubmit} className="card mt-5 space-y-4 p-5">
        <div>
          <label htmlFor="reference" className="label">
            Application reference
          </label>
          <input
            id="reference"
            name="reference"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="FIN-EBS-FIN-001-000125"
            className="field font-mono"
          />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Mobile number
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="98765 43210" className="field" />
        </div>

        {error && (
          <p role="alert" className="error">
            <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? <Loader2 size={18} strokeWidth={2.5} aria-hidden className="animate-spin" /> : "Check status"}
        </button>
      </form>

      {result && tone && ToneIcon && (
        <section aria-live="polite" className={`card mt-4 overflow-hidden`}>
          <div className={`flex items-center gap-3 border-b-2 border-ink px-5 py-4 ${tone.surface}`}>
            <ToneIcon size={26} strokeWidth={2.25} aria-hidden className="shrink-0" />
            <div>
              <p className="text-lg font-extrabold leading-tight">{result.label}</p>
              <p className="text-sm text-body">{result.jobTitle}</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed text-body">{result.detail}</p>
            <p className="hint mt-3">
              <span className="font-mono">{result.applicationReference}</span> · applied{" "}
              {new Date(result.appliedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
