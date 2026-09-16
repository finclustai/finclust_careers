"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { errorText, send } from "@/lib/client-api";
import { SOURCE_LABEL, STATUS_STYLE, relativeTime } from "@/lib/status";
import { filterQuery, type ResultsPage } from "./query";

/**
 * The list follows the address bar. Filters change the URL with the browser's
 * own history API and this fetches the matching page itself, instead of a
 * Next.js navigation: those could hang for good in Chrome on this page. The
 * first page still arrives rendered from the server.
 */
export function Results({ initial, initialQuery }: { initial: ResultsPage; initialQuery: string }) {
  const params = useSearchParams();
  const query = filterQuery((key) => params.get(key));
  const [shown, setShown] = useState({ query: initialQuery, data: initial });
  const [error, setError] = useState<string | null>(null);
  const loading = shown.query !== query;

  useEffect(() => {
    if (query === shown.query) return;
    let current = true;
    setError(null);
    send<ResultsPage>("GET", `/applications?${query}`).then(
      (data) => current && setShown({ query, data }),
      (caught) => current && setError(errorText(caught)),
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const data = shown.data;
  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div aria-busy={loading} className={loading && !error ? "opacity-60 transition-opacity" : undefined}>
      <p className="mb-3 flex items-center gap-2 text-sm text-mid" aria-live="polite">
        {loading && !error ? (
          <>
            <Loader2 size={14} strokeWidth={2.5} aria-hidden className="animate-spin" />
            Updating…
          </>
        ) : (
          <>
            <span className="tnum font-bold">{data.total}</span> matching
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="error mb-3">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}
      {data.items.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-extrabold">No applications match</h2>
          <p className="mt-2 text-sm text-body">
            Clear a filter or widen the date range to see more.
          </p>
        </div>
      ) : (
        <>
          {/* Phone: each application is a card. A 720px table inside a 375px
              screen is technically scrollable and practically unusable, so the
              same data is stacked instead. Tablet and up get the table. */}
          <ul className="space-y-2.5 md:hidden">
            {data.items.map((row) => {
              const style = STATUS_STYLE[row.status];
              return (
                <li key={row.id} className="card p-3">
                  <div className="flex items-start gap-2.5">
                    <WhatsAppButton phone={row.candidate.phone} candidateName={row.candidate.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/applications/${row.id}`}
                        className="flex min-h-[44px] items-center font-bold leading-tight underline decoration-transparent underline-offset-2 hover:decoration-orange"
                      >
                        {row.candidate.name}
                      </Link>
                      <p className="-mt-1.5 font-mono text-xs text-mid">{row.candidate.phone}</p>
                    </div>
                    <span className={`chip shrink-0 self-start ${style.chip}`}>
                      <span className={`size-2 rounded-full ${style.dot}`} aria-hidden />
                      {style.label}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-body">
                    {row.jobOpening.title}{" "}
                    <span className="font-mono text-mid">{row.jobOpening.jobId}</span>
                  </p>
                  <p className="mt-1 text-xs text-mid">
                    {[
                      row.candidate.totalExperience != null ? `${row.candidate.totalExperience} yrs` : null,
                      row.candidate.location,
                      SOURCE_LABEL[row.source] ?? row.source,
                      relativeTime(row.appliedAt),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <Link href={`/admin/applications/${row.id}`} className="action mt-2.5 w-full">
                    Open application
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  {["Candidate", "Job", "Source", "Applied", "Status", ""].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-mid">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => {
                  const style = STATUS_STYLE[row.status];
                  return (
                    <tr key={row.id} className="border-b border-line last:border-0 hover:bg-sand">
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <WhatsAppButton phone={row.candidate.phone} candidateName={row.candidate.name} />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/applications/${row.id}`}
                              className="block font-bold leading-tight underline decoration-transparent underline-offset-2 hover:decoration-orange"
                            >
                              {row.candidate.name}
                            </Link>
                            <p className="mt-0.5 font-mono text-xs text-mid">{row.candidate.phone}</p>
                            <p className="mt-0.5 text-xs text-body">
                              {[
                                row.candidate.totalExperience != null ? `${row.candidate.totalExperience} yrs` : null,
                                row.candidate.location,
                              ].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-semibold leading-tight">{row.jobOpening.title}</p>
                        <p className="mt-0.5 font-mono text-xs text-mid">{row.jobOpening.jobId}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{SOURCE_LABEL[row.source] ?? row.source}</td>
                      <td className="px-3 py-2.5 text-xs text-mid">{relativeTime(row.appliedAt)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`chip ${style.chip}`}>
                          <span className={`size-2 rounded-full ${style.dot}`} aria-hidden />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/admin/applications/${row.id}`} className="action">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
              <PageButton page={data.page - 1} disabled={data.page <= 1}>
                Previous
              </PageButton>
              <span className="tnum text-xs font-bold text-mid">
                Page {data.page} of {lastPage}
              </span>
              <PageButton page={data.page + 1} disabled={data.page >= lastPage}>
                Next
              </PageButton>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function PageButton({ page, disabled, children }: { page: number; disabled: boolean; children: React.ReactNode }) {
  const params = useSearchParams();
  if (disabled) {
    return <span className="rounded-[8px] border-2 border-line px-3 py-1.5 text-xs font-bold text-placeholder">{children}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => {
        const next = new URLSearchParams(params.toString());
        next.set("page", String(page));
        window.history.pushState(null, "", `?${next}`);
        window.scrollTo({ top: 0 });
      }}
      className="min-h-[44px] rounded-[8px] border-2 border-ink bg-paper px-3 py-1.5 text-xs font-bold"
    >
      {children}
    </button>
  );
}
