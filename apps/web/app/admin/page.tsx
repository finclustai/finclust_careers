import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { apiGet, getSession } from "@/lib/server-api";
import { APPLICATION_STATUSES, SOURCE_LABEL, STATUS_STYLE, relativeTime, type ApplicationStatus } from "@/lib/status";
import { MarkSeen } from "./mark-seen";

export const dynamic = "force-dynamic";

interface Dashboard {
  totals: {
    applications: number;
    today: number;
    last7Days: number;
    awaitingReview: number;
    newSinceLastVisit: number;
    activeJobs: number;
  };
  lastSeenAt: string | null;
  daily: { date: string; count: number }[];
  funnel: Partial<Record<ApplicationStatus, number>>;
  sources: Record<string, number>;
  jobs: {
    id: string;
    jobId: string;
    title: string;
    closesAt: string | null;
    clicks: number;
    applications: number;
    awaitingReview: number;
  }[];
  recent: {
    id: string;
    status: ApplicationStatus;
    source: string;
    appliedAt: string;
    candidate: { name: string };
    jobOpening: { jobId: string; title: string };
  }[];
}

const dayLabel = (date: string, style: "short" | "long" = "short") =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
  });

export default async function DashboardPage() {
  const [data, user] = await Promise.all([apiGet<Dashboard>("/dashboard"), getSession()]);
  const { totals } = data;
  const peak = Math.max(1, ...data.daily.map((d) => d.count));
  const funnelPeak = Math.max(1, ...Object.values(data.funnel).map(Number));
  const sourceTotal = Object.values(data.sources).reduce((sum, n) => sum + n, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <MarkSeen />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-mid">
            {totals.newSinceLastVisit > 0 ? (
              <>
                <span className="chip bg-orange-tint !py-0.5 tnum">{totals.newSinceLastVisit} new</span>{" "}
                {data.lastSeenAt ? "since your last visit" : "applications so far"}
              </>
            ) : (
              "Nothing new since your last visit."
            )}
          </p>
        </div>
        <Link href="/admin/board" className="btn btn-primary">
          <LayoutGrid size={17} strokeWidth={2.5} aria-hidden />
          Open combined board
        </Link>
      </header>

      <section aria-label="Key numbers" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Jobs collecting" value={totals.activeJobs} href="/admin/jobs" />
        <Tile label="Applied today" value={totals.today} />
        <Tile label="Last 7 days" value={totals.last7Days} />
        <Tile
          label="Awaiting review"
          value={totals.awaitingReview}
          href="/admin/applications?status=NEW"
          highlight={totals.awaitingReview > 0}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card p-4">
          <h2 className="text-sm font-extrabold">Applications, last 14 days</h2>
          <div
            role="img"
            aria-label={`Applications per day from ${dayLabel(data.daily[0].date, "long")} to today: ${data.daily
              .map((d) => d.count)
              .join(", ")}`}
            className="mt-4 flex h-40 items-end gap-1.5"
          >
            {data.daily.map((day, i) => (
              <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                {day.count > 0 && <span className="tnum text-[11px] font-bold">{day.count}</span>}
                {day.count === 0 ? (
                  <div title={`${dayLabel(day.date)}: 0`} className="h-0.5 w-full bg-line" />
                ) : (
                  <div
                    title={`${dayLabel(day.date)}: ${day.count}`}
                    className={`w-full rounded-t-[5px] border-2 border-b-0 border-ink ${
                      i === data.daily.length - 1 ? "bg-orange" : "bg-orange-tint"
                    }`}
                    style={{ height: `${Math.max(8, (day.count / peak) * 85)}%` }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between border-t-2 border-ink pt-1.5 text-[11px] text-mid">
            <span>{dayLabel(data.daily[0].date)}</span>
            <span>Today</span>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-extrabold">Where applicants came from</h2>
          {sourceTotal === 0 ? (
            <p className="hint">No applications yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {Object.entries(data.sources)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <li key={source}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{SOURCE_LABEL[source] ?? source}</span>
                      <span className="tnum text-mid">
                        {count} · {Math.round((count / sourceTotal) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full border-2 border-ink bg-sand">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${(count / sourceTotal) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card p-4">
          <h2 className="text-sm font-extrabold">Jobs collecting applications</h2>
          <p className="hint">Opens are link visits. Conversion is applications per open.</p>
          {data.jobs.length === 0 ? (
            <p className="mt-3 text-sm text-body">
              No job is collecting right now.{" "}
              <Link href="/admin/jobs" className="font-bold underline decoration-orange decoration-2 underline-offset-4">
                Start one
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y-2 divide-line">
              {data.jobs.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="font-bold underline decoration-transparent underline-offset-4 hover:decoration-orange"
                    >
                      {job.title}
                    </Link>
                    <p className="font-mono text-xs text-mid">
                      {job.jobId}
                      {job.closesAt && ` · closes ${new Date(job.closesAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                  <dl className="flex gap-4 text-center">
                    <Stat label="Opens" value={job.clicks} />
                    <Stat label="Applied" value={job.applications} />
                    <Stat
                      label="Conv."
                      value={job.clicks ? `${Math.min(100, Math.round((job.applications / job.clicks) * 100))}%` : "—"}
                    />
                    <Stat label="To review" value={job.awaitingReview} strong={job.awaitingReview > 0} />
                  </dl>
                  <Link href={`/admin/jobs/${job.id}/board`} className="action" aria-label={`Board for ${job.title}`}>
                    <LayoutGrid size={14} strokeWidth={2.5} aria-hidden />
                    Board
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-extrabold">Pipeline</h2>
          <p className="hint">
            <span className="tnum">{totals.applications}</span> applications across all jobs.
          </p>
          <ul className="mt-3 space-y-1">
            {APPLICATION_STATUSES.map((status) => {
              const count = data.funnel[status] ?? 0;
              return (
                <li key={status}>
                  <Link
                    href={`/admin/applications?status=${status}`}
                    className="flex min-h-[36px] items-center gap-2.5 rounded-[8px] px-1 text-sm hover:bg-sand"
                  >
                    <span className="w-24 shrink-0 font-semibold">{STATUS_STYLE[status].label}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-sand">
                      <span
                        className={`block h-full rounded-full ${STATUS_STYLE[status].dot}`}
                        style={{ width: `${(count / funnelPeak) * 100}%` }}
                      />
                    </span>
                    <span className="tnum w-8 shrink-0 text-right font-bold">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold">Latest applications</h2>
          <Link href="/admin/applications" className="text-link">
            See all <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="hint">Applications will appear here as candidates apply.</p>
        ) : (
          <ul className="mt-2 divide-y-2 divide-line">
            {data.recent.map((app) => {
              const fresh = !data.lastSeenAt || app.appliedAt > data.lastSeenAt;
              return (
                <li key={app.id}>
                  <Link href={`/admin/applications/${app.id}`} className="flex min-h-[56px] items-center gap-3 py-2 hover:bg-sand">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {app.candidate.name}
                        {fresh && <span className="chip ml-2 bg-orange-tint !px-2 !py-0 text-[11px]">New</span>}
                      </p>
                      <p className="truncate text-xs text-mid">
                        {app.jobOpening.title} · {SOURCE_LABEL[app.source] ?? app.source} · {relativeTime(app.appliedAt)}
                      </p>
                    </div>
                    <span className={`chip shrink-0 ${STATUS_STYLE[app.status].chip}`}>
                      {STATUS_STYLE[app.status].label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function Tile({ label, value, href, highlight }: { label: string; value: number; href?: string; highlight?: boolean }) {
  const body = (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-mid">{label}</p>
      <p className="tnum mt-1 text-3xl font-extrabold">{value}</p>
    </>
  );
  const className = `card block p-4 ${highlight ? "!bg-orange-tint" : ""}`;
  return href ? (
    <Link href={href} className={`${className} hover:!bg-sand`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Stat({ label, value, strong }: { label: string; value: number | string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-mid">{label}</dt>
      <dd className={`tnum text-sm ${strong ? "font-extrabold" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}
