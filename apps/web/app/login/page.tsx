"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          Array.isArray(body.message) ? body.message[0] : (body.message ?? "Could not sign in."),
        );
        setSubmitting(false);
        return;
      }

      router.push("/admin/jobs");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-mid">FINCLUST</p>
        <h1 className="mt-2 text-2xl font-extrabold">Recruitment console</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card p-5">
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              className="field"
              aria-invalid={error ? "true" : undefined}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="field"
              aria-invalid={error ? "true" : undefined}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="error mt-4">
            <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary mt-5 w-full">
          {submitting ? (
            <>
              <Loader2 size={18} strokeWidth={2.5} aria-hidden className="animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </main>
  );
}
