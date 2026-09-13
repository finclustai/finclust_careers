import Link from "next/link";
import { apiGet } from "@/lib/server-api";
import { JobCardActions } from "./job-card-actions";

export const dynamic = "force-dynamic";

type JobStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED";

const STATUS_LABEL: Record<JobStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Collecting",
  ON_HOLD: "Paused",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

interface JobList {
  items: {
    id: string;
    jobId: string;
    title: string;
    client: string | null;
    location: string | null;
    status: JobStatus;
    profile: { name: string };
    _count: { applications: number };
  }[];
  total: number;
}

export default async function JobsPage() {
  const data = await apiGet<JobList>("/jobs?pageSize=50");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Job openings</h1>
        <Link href="/admin/jobs/new" className="btn btn-primary shrink-0">
          New job
        </Link>
      </header>

      {data.items.length === 0 ? (
        <div className="card p-6 text-center">
          <h2 className="font-extrabold">No job openings yet</h2>
          <p className="mt-2 text-sm text-body">Create one to start collecting applications.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((job) => (
            // The card is no longer a link: it holds buttons, and nesting
            // interactive elements inside an anchor is invalid and breaks both
            // keyboard navigation and the buttons themselves. The title links.
            <li key={job.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="inline-flex min-h-[44px] items-center truncate font-extrabold underline decoration-transparent underline-offset-4 hover:decoration-orange"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-mid">{job.jobId}</p>
                  <p className="mt-1.5 text-xs text-body">
                    {[job.profile.name, job.client, job.location].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-xl font-extrabold">{job._count.applications}</p>
                  <p className="text-xs text-mid">applications</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`chip ${
                    job.status === "ACTIVE"
                      ? "bg-green-tint"
                      : job.status === "ON_HOLD"
                        ? "border-dashed opacity-70"
                        : "bg-sand"
                  }`}
                >
                  {STATUS_LABEL[job.status]}
                </span>
              </div>

              <JobCardActions id={job.id} jobId={job.jobId} status={job.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
