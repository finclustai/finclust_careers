import Link from "next/link";
import { Suspense } from "react";
import { apiGet } from "@/lib/server-api";
import { SOURCE_LABEL, STATUS_STYLE, relativeTime, type ApplicationStatus } from "@/lib/status";
import { Filters, type FilterOptions } from "./filters";
import { WhatsAppButton } from "@/components/whatsapp-button";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  applicationReference: string;
  status: ApplicationStatus;
  source: string;
  appliedAt: string;
  candidate: { id: string; name: string; phone: string; location: string | null; totalExperience: string | number | null };
  assignedRecruiter: { id: string; name: string } | null;
  jobOpening: { id: string; jobId: string; title: string };
}

interface Page {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
}

const FILTER_KEYS = [
  "jobOpeningId", "profileId", "recruiterId", "status", "source",
  "appliedFrom", "appliedTo", "search", "page",
] as const;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value !== "") query.set(key, value);
  }

  const [jobs, profiles, recruiters] = await Promise.all([
    apiGet<{ items: { id: string; jobId: string; title: string }[] }>("/jobs?pageSize=100"),
    apiGet<{ id: string; name: string }[]>("/job-profiles"),
    apiGet<{ id: string; name: string }[]>("/recruiters").catch(() => []),
  ]);

  const options: FilterOptions = { jobs: jobs.items, profiles, recruiters };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold">Applications</h1>
      </header>

      <Filters options={options} />

      {/* Keyed by the filters: each change gets a fresh boundary, so the old
          results give way to a skeleton at once. Without it a filter change in
          Chrome could hang for good (see ./loading.tsx). */}
      <Suspense key={query.toString()} fallback={<ResultsSkeleton />}>
        <Results query={query.toString()} />
      </Suspense>
    </main>
  );
}

async function Results({ query: queryString }: { query: string }) {
  const query = new URLSearchParams(queryString);
  const data = await apiGet<Page>(`/applications?${query}`);
  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <p className="mb-3 text-sm text-mid">
        <span className="tnum font-bold">{data.total}</span> matching
      </p>
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
              <PageLink query={query} page={data.page - 1} disabled={data.page <= 1}>
                Previous
              </PageLink>
              <span className="tnum text-xs font-bold text-mid">
                Page {data.page} of {lastPage}
              </span>
              <PageLink query={query} page={data.page + 1} disabled={data.page >= lastPage}>
                Next
              </PageLink>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading applications" className="animate-pulse space-y-2.5">
      <div className="h-4 w-24 rounded-[10px] bg-line" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-[14px] border-2 border-line bg-sand" />
      ))}
    </div>
  );
}

function PageLink({
  query,
  page,
  disabled,
  children,
}: {
  query: URLSearchParams;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-[8px] border-2 border-line px-3 py-1.5 text-xs font-bold text-placeholder">
        {children}
      </span>
    );
  }
  const next = new URLSearchParams(query);
  next.set("page", String(page));
  return (
    <Link
      href={`/admin/applications?${next}`}
      className="rounded-[8px] border-2 border-ink bg-paper px-3 py-1.5 text-xs font-bold"
    >
      {children}
    </Link>
  );
}
