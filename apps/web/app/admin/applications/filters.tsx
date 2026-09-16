"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { APPLICATION_SOURCES, APPLICATION_STATUSES, SOURCE_LABEL, STATUS_STYLE } from "@/lib/status";

export interface FilterOptions {
  jobs: { id: string; jobId: string; title: string }[];
  profiles: { id: string; name: string }[];
  recruiters: { id: string; name: string }[];
}

const MORE = ["profileId", "status", "source", "appliedFrom", "appliedTo"] as const;

/**
 * One slim row like the board's: search as you type and a job picker, with the
 * rarer filters behind "More filters". Every filter lives in the URL, so a
 * filtered view can be bookmarked or sent to a colleague.
 */
export function Filters({ options }: { options: FilterOptions }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const moreActive = MORE.filter((key) => params.get(key)).length;
  const [showMore, setShowMore] = useState(moreActive > 0);
  const typing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Back to page one: page 7 of a result set that now has two pages is empty.
    next.delete("page");
    // The browser's history API, not a Next.js navigation (see ./results.tsx).
    window.history.pushState(null, "", `${pathname}?${next}`);
  }

  // Results follow the typing, a moment after it pauses.
  function type(value: string) {
    setSearch(value);
    clearTimeout(typing.current);
    typing.current = setTimeout(() => apply({ search: value.trim() }), 350);
  }

  const anyActive = moreActive > 0 || Boolean(params.get("search")) || Boolean(params.get("jobOpeningId"));

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Search applications</span>
          <Search size={16} strokeWidth={2.5} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mid" />
          <input
            type="search"
            value={search}
            onChange={(event) => type(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              clearTimeout(typing.current);
              apply({ search: search.trim() });
            }}
            placeholder="Name, phone, email or reference"
            className="field !min-h-[44px] !pl-9"
          />
        </label>

        <label className="min-w-0 flex-1 basis-48 sm:max-w-xs">
          <span className="sr-only">Filter by job</span>
          <select
            value={params.get("jobOpeningId") ?? ""}
            onChange={(event) => apply({ jobOpeningId: event.target.value })}
            className="field !min-h-[44px]"
          >
            <option value="">All jobs</option>
            {options.jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.jobId})
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          aria-expanded={showMore}
          aria-controls="more-filters"
          className={`btn !min-h-[44px] ${showMore || moreActive ? "btn-primary" : "btn-secondary"}`}
        >
          <SlidersHorizontal size={16} strokeWidth={2.5} aria-hidden />
          More filters{moreActive ? ` (${moreActive})` : ""}
        </button>
      </div>

      {showMore && (
        <div id="more-filters" className="mt-2 grid grid-cols-2 gap-2 rounded-[14px] border-2 border-ink bg-paper p-3 sm:grid-cols-3 lg:grid-cols-5">
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
          <DateFilter label="Applied from" value={params.get("appliedFrom") ?? ""} onChange={(v) => apply({ appliedFrom: v })} />
          <DateFilter label="Applied to" value={params.get("appliedTo") ?? ""} onChange={(v) => apply({ appliedTo: v })} />
        </div>
      )}

      {anyActive && (
        <button
          type="button"
          onClick={() => {
            clearTimeout(typing.current);
            setSearch("");
            window.history.pushState(null, "", pathname);
          }}
          className="text-link mt-1 text-mid"
        >
          <X size={13} strokeWidth={2.5} aria-hidden />
          Clear filters
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
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-bold text-mid">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="field !min-h-[44px] !py-2 sm:!text-[13px]">
        <option value="">All</option>
        {children}
      </select>
    </label>
  );
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-bold text-mid">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="field !min-h-[44px] !py-2 sm:!text-[13px]" />
    </label>
  );
}
