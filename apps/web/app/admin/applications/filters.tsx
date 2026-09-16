"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { APPLICATION_SOURCES, APPLICATION_STATUSES, SOURCE_LABEL, STATUS_STYLE } from "@/lib/status";


export interface FilterOptions {
  jobs: { id: string; jobId: string; title: string }[];
  profiles: { id: string; name: string }[];
  recruiters: { id: string; name: string }[];
}

/**
 * Every filter is reflected in the URL, so a filtered view is a link a recruiter
 * can send to a colleague or bookmark, and the browser back button restores it.
 */
export function Filters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change returns to page one: staying on page 7 of a result set
    // that now has two pages shows an empty screen for no reason.
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next}`));
  }

  const active = ["jobOpeningId", "profileId", "recruiterId", "status", "source", "appliedFrom", "appliedTo", "search"]
    .filter((key) => params.get(key));

  return (
    <div className="card mb-4 p-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ search });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            strokeWidth={2}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mid"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, phone, email, reference or job"
            aria-label="Search applications"
            className="field pl-9"
          />
        </div>
        <button type="submit" className="btn btn-primary px-4">
          {pending ? <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" /> : "Search"}
        </button>
      </form>

      {/* On a phone six filter controls are a wall of form. They collapse behind
          a disclosure that says how many are active; from tablet up there is
          room to show them all and the disclosure is always open. */}
      <details className="filters mt-2">
        <summary className="text-link cursor-pointer list-none text-mid marker:hidden sm:hidden">
          Filters{active.length ? ` (${active.length})` : ""}
          <ChevronDown size={15} strokeWidth={2.5} aria-hidden />
        </summary>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-3 lg:grid-cols-6">
        <Select label="Job" value={params.get("jobOpeningId") ?? ""} onChange={(v) => apply({ jobOpeningId: v })}>
          {options.jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.jobId}
            </option>
          ))}
        </Select>

        <Select label="Profile" value={params.get("profileId") ?? ""} onChange={(v) => apply({ profileId: v })}>
          {options.profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <Select label="Status" value={params.get("status") ?? ""} onChange={(v) => apply({ status: v })}>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_STYLE[s].label}
            </option>
          ))}
        </Select>

        <Select label="Source" value={params.get("source") ?? ""} onChange={(v) => apply({ source: v })}>
          {APPLICATION_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </Select>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-mid">Applied from</span>
          <input
            type="date"
            value={params.get("appliedFrom") ?? ""}
            onChange={(event) => apply({ appliedFrom: event.target.value })}
            className="field !py-2 sm:!min-h-[40px] sm:!text-[13px]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-mid">Applied to</span>
          <input
            type="date"
            value={params.get("appliedTo") ?? ""}
            onChange={(event) => apply({ appliedTo: event.target.value })}
            className="field !py-2 sm:!min-h-[40px] sm:!text-[13px]"
          />
        </label>
        </div>
      </details>

      {active.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            startTransition(() => router.push(pathname));
          }}
          className="text-link mt-1 text-mid"
        >
          <X size={13} strokeWidth={2.5} aria-hidden />
          Clear {active.length} filter{active.length === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-mid">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field !py-2 sm:!min-h-[40px] sm:!text-[13px]"
      >
        <option value="">All</option>
        {children}
      </select>
    </label>
  );
}
