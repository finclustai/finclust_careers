import { apiGet } from "@/lib/server-api";
import { JobForm, type Profile } from "../job-form";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const profiles = await apiGet<Profile[]>("/job-profiles");

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">New job opening</h1>
      <p className="mt-1 text-sm text-mid">
        Activating the job generates its application links automatically.
      </p>
      <JobForm profiles={profiles} />
    </main>
  );
}
