import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import { JobForm, type JobValues, type Profile } from "../../job-form";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, profiles] = await Promise.all([
    apiGet<JobValues & { id: string; title: string; profile: { id: string } }>(`/jobs/${id}`),
    apiGet<Profile[]>("/job-profiles"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href={`/admin/jobs/${id}`} className="text-link text-mid">
        <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
        Back to job
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">Edit job opening</h1>
      <JobForm profiles={profiles} job={job} />
    </main>
  );
}
