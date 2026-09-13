import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import { ShareKit } from "./share-kit";
import { JobControls } from "./job-controls";

export const dynamic = "force-dynamic";

interface JobDetail {
  id: string;
  jobId: string;
  title: string;
  client: string | null;
  location: string | null;
  status: string;
  minExperience: number | null;
  maxExperience: number | null;
  requiredSkills: string[];
  description: string | null;
  profile: { name: string };
  _count: { applications: number };
  share: {
    links: { source: string; url: string; clickCount: number }[];
    whatsappMessage: string;
    whatsappShareUrl: string;
  };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await apiGet<JobDetail>(`/jobs/${id}`);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/admin/jobs" className="text-link text-mid">
        <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
        All jobs
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{job.title}</h1>
          <p className="mt-1 font-mono text-sm text-mid">{job.jobId}</p>
          <p className="mt-1.5 text-sm text-body">
            {[job.profile.name, job.client, job.location].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="chip">{job.status}</span>
      </header>

      <Link
        href={`/admin/jobs/${job.id}/board`}
        className="btn btn-primary mt-4 w-full sm:w-auto"
      >
        <LayoutGrid size={17} strokeWidth={2.5} aria-hidden />
        Open pipeline board ({job._count.applications})
      </Link>

      <JobControls jobId={job.id} status={job.status as "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED"} />

      {job.status === "ACTIVE" && <ShareKit share={job.share} />}

      {job.description && (
        <section className="card mt-4 p-4">
          <h2 className="text-sm font-extrabold">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-body">{job.description}</p>
        </section>
      )}
    </main>
  );
}
