"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export interface Profile {
  id: string;
  name: string;
}

export interface JobValues {
  id?: string;
  jobId?: string;
  title?: string;
  profileId?: string;
  client?: string | null;
  location?: string | null;
  description?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  openings?: number | null;
  requiredSkills?: string[];
  candidateNoteEnabled?: boolean;
  closesAt?: string | null;
}

const IST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

// Sentinel for the "Other…" option. Not a real id, so it can never collide.
const OTHER = "__other__";

export function JobForm({
  profiles: initialProfiles,
  job,
}: {
  profiles: Profile[];
  /** Existing job to edit, or with no id, a job to copy into a new one. */
  job?: JobValues;
}) {
  const router = useRouter();
  const editing = Boolean(job?.id);
  const closesOn = job?.closesAt ? IST_DATE.format(new Date(job.closesAt)) : "";

  const [profiles, setProfiles] = useState(initialProfiles);
  const [profileId, setProfileId] = useState(job?.profileId ?? "");
  const [newProfile, setNewProfile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Creates the profile first so the job can reference it. Idempotent by name. */
  async function resolveProfileId(): Promise<string> {
    if (profileId !== OTHER) return profileId;

    const name = newProfile.trim();
    if (!name) throw new Error("Enter a name for the new job profile.");

    const response = await fetch("/api/job-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(Array.isArray(body.message) ? body.message[0] : body.message);
    }

    setProfiles((all) => (all.some((p) => p.id === body.id) ? all : [...all, body]));
    return body.id as string;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const data = new FormData(event.currentTarget);
    const text = (key: string) => {
      const value = String(data.get(key) ?? "").trim();
      return value === "" ? undefined : value;
    };
    const number = (key: string) => {
      const value = text(key);
      return value === undefined ? undefined : Number(value);
    };

    try {
      const resolvedProfileId = await resolveProfileId();
      if (!resolvedProfileId) throw new Error("Choose a job profile.");

      const payload: Record<string, unknown> = {
        title: String(data.get("title") ?? "").trim(),
        profileId: resolvedProfileId,
        client: text("client"),
        location: text("location"),
        description: text("description"),
        workMode: text("workMode"),
        employmentType: text("employmentType"),
        minExperience: number("minExperience"),
        maxExperience: number("maxExperience"),
        openings: number("openings"),
        requiredSkills:
          text("requiredSkills")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
        candidateNoteEnabled: data.get("candidateNoteEnabled") === "on",
        // The end of the chosen day in India. Blank clears an existing date.
        closesAt: text("closesAt") ? `${text("closesAt")}T23:59:59+05:30` : editing ? null : undefined,
      };
      // jobId is immutable: it is baked into every reference already issued and
      // every link already shared.
      if (!editing) payload.jobId = String(data.get("jobId") ?? "").trim().toUpperCase();

      const response = await fetch(editing ? `/api/jobs/${job!.id}` : "/api/jobs", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message);
      }

      if (!editing && data.get("activate") === "on") {
        await fetch(`/api/jobs/${body.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE" }),
        });
      }

      router.push(`/admin/jobs/${editing ? job!.id : body.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the job.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card mt-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {editing ? (
          <div>
            <span className="label">Job ID</span>
            <p className="field flex items-center bg-sand font-mono">{job?.jobId}</p>
            <span className="hint block">
              Cannot be changed: it appears in every reference and shared link.
            </span>
          </div>
        ) : (
          <Text
            name="jobId"
            label="Job ID"
            required
            mono
            placeholder="EBS-FIN-001"
            hint="Uppercase letters, digits and hyphens. Cannot be changed later."
          />
        )}

        <Text name="title" label="Job title" required defaultValue={job?.title}
          placeholder="Oracle EBS Finance Consultant" />

        <div className="sm:col-span-2">
          <label htmlFor="profileId" className="label">
            Job profile<span className="text-[#c11a12]"> *</span>
          </label>
          <select
            id="profileId"
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            className="field"
          >
            <option value="" disabled>
              Choose a profile
            </option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={OTHER}>Other — add a new profile…</option>
          </select>

          {profileId === OTHER && (
            <input
              value={newProfile}
              onChange={(event) => setNewProfile(event.target.value)}
              placeholder="e.g. Oracle SCM Functional"
              aria-label="New job profile name"
              autoFocus
              className="field mt-2"
            />
          )}
        </div>

        <Text name="client" label="Client" defaultValue={job?.client ?? ""} placeholder="Gulf Energy" />
        <Text name="location" label="Location" defaultValue={job?.location ?? ""} placeholder="Bengaluru" />

        <Choice name="workMode" label="Work mode" defaultValue={job?.workMode ?? ""}
          options={[["ONSITE", "On-site"], ["HYBRID", "Hybrid"], ["REMOTE", "Remote"]]} />
        <Choice name="employmentType" label="Employment type" defaultValue={job?.employmentType ?? ""}
          options={[["FULL_TIME", "Full-time"], ["CONTRACT", "Contract"], ["INTERNSHIP", "Internship"]]} />

        <Text name="openings" label="Number of openings" type="number" min="1" max="999"
          defaultValue={job?.openings ?? ""} placeholder="1" />
        <Text name="minExperience" label="Minimum experience (years)" type="number" min="0" max="60"
          defaultValue={job?.minExperience ?? ""} />
        <Text name="maxExperience" label="Maximum experience (years)" type="number" min="0" max="60"
          defaultValue={job?.maxExperience ?? ""} />
        <Text name="closesAt" label="Stop collecting after" type="date" defaultValue={closesOn}
          hint="Optional. Applications close automatically at the end of this day." />
      </div>

      <div className="mt-4">
        <Text name="requiredSkills" label="Required skills" hint="Separate with commas."
          defaultValue={job?.requiredSkills?.join(", ") ?? ""} placeholder="Oracle EBS, GL, AP, AR" />
      </div>

      <label className="mt-4 block">
        <span className="label">Description</span>
        <textarea
          name="description"
          rows={7}
          defaultValue={job?.description ?? ""}
          className="field"
          placeholder="What the role involves, responsibilities, what you are looking for…"
        />
      </label>

      <label className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] border-2 border-ink bg-paper p-3.5">
        <input
          type="checkbox"
          name="candidateNoteEnabled"
          defaultChecked={job?.candidateNoteEnabled ?? true}
          className="mt-0.5 size-6 shrink-0 accent-[#ff8a1e]"
        />
        <span className="text-sm">
          Ask candidates for a note
          <span className="hint block">
            Shows an optional box above the CV upload for anything they want to add, like notice period or a short cover note.
          </span>
        </span>
      </label>

      {!editing && (
        <label className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] border-2 border-ink bg-sand p-3.5">
          <input type="checkbox" name="activate" defaultChecked className="mt-0.5 size-6 shrink-0 accent-[#ff8a1e]" />
          <span className="text-sm">
            Start collecting applications immediately
            <span className="hint block">
              Generates the application links. Leave unchecked to save as a draft.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="error mt-4">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? (
          <>
            <Loader2 size={18} strokeWidth={2.5} aria-hidden className="animate-spin" />
            Saving…
          </>
        ) : editing ? (
          "Save changes"
        ) : (
          "Create job opening"
        )}
      </button>
    </form>
  );
}

function Text({
  name,
  label,
  required,
  hint,
  mono,
  ...input
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  mono?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-[#c11a12]"> *</span>}
      </span>
      <input id={name} name={name} className={`field ${mono ? "font-mono" : ""}`} {...input} />
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

function Choice({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: [string, string][];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} className="field">
        <option value="">Not specified</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
