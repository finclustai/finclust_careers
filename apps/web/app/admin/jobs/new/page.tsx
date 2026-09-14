import { apiGet } from "@/lib/server-api";
import { JobForm, type JobValues, type Profile } from "../job-form";

export const dynamic = "force-dynamic";

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const [profiles, source] = await Promise.all([
    apiGet<Profile[]>("/job-profiles"),
    from ? apiGet<JobValues>(`/jobs/${encodeURIComponent(from)}`).catch(() => null) : null,
  ]);
  // A clone copies everything except what makes a job unique.
  const copy = source ? { ...source, id: undefined, jobId: undefined, closesAt: null } : undefined;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">{copy ? `Copy of ${copy.title}` : "New job opening"}</h1>
      <p className="mt-1 text-sm text-mid">
        {copy
          ? "Everything is copied except the Job ID and closing date. Give it a new Job ID."
          : "Activating the job generates its application links automatically."}
      </p>
      <JobForm profiles={profiles} job={copy} />
    </main>
  );
}
