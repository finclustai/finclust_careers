"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, KeyRound, Loader2, Plus, Power, ShieldCheck } from "lucide-react";
import { errorText, send } from "@/lib/client-api";

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="error w-full">
      <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
      {message}
    </p>
  );
}

export function AddUser() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      await send("POST", "/users", {
        name: String(data.get("name") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        role: data.get("role"),
      });
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary mt-4">
        <Plus size={17} strokeWidth={2.5} aria-hidden />
        Add a user
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-4 grid gap-3 p-4 sm:grid-cols-2">
      <label className="block">
        <span className="label">Name</span>
        <input name="name" required minLength={2} autoComplete="off" className="field" />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="off" className="field" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="text" required minLength={8} autoComplete="new-password" className="field font-mono" />
        <span className="hint block">At least 8 characters. Share it with them directly.</span>
      </label>
      <label className="block">
        <span className="label">Role</span>
        <select name="role" defaultValue="RECRUITER" className="field">
          <option value="RECRUITER">Recruiter</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>
      <ErrorLine message={error} />
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-primary flex-1">
          {busy && <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />}
          Add user
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function UserActions({
  user,
}: {
  user: { id: string; name: string; role: "ADMIN" | "RECRUITER"; isActive: boolean };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (done) setNotice(done);
      router.refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          // ponytail: native prompt. Plain text so the admin can read back what
          // they will tell the person; swap for a dialog if it grows options.
          const password = prompt(`New password for ${user.name} (at least 8 characters):`);
          if (password) void run(() => send("PUT", `/users/${user.id}/password`, { password }), `Password changed. Tell ${user.name} the new one.`);
        }}
        className="action"
      >
        <KeyRound size={14} strokeWidth={2.5} aria-hidden />
        Reset password
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => send("PUT", `/users/${user.id}`, { role: user.role === "ADMIN" ? "RECRUITER" : "ADMIN" }))}
        className="action"
      >
        <ShieldCheck size={14} strokeWidth={2.5} aria-hidden />
        {user.role === "ADMIN" ? "Make recruiter" : "Make admin"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!user.isActive || confirm(`Deactivate ${user.name}? They are signed out at once and cannot sign in until reactivated.`)) {
            void run(() => send("PUT", `/users/${user.id}`, { isActive: !user.isActive }));
          }
        }}
        className="action"
      >
        <Power size={14} strokeWidth={2.5} aria-hidden />
        {user.isActive ? "Deactivate" : "Reactivate"}
      </button>
      {notice && (
        <p role="status" className="hint w-full !text-ink">
          {notice}
        </p>
      )}
      <ErrorLine message={error} />
    </div>
  );
}
