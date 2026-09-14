import { redirect } from "next/navigation";
import { apiGet, getSession } from "@/lib/server-api";
import { TrashActions } from "./trash-actions";

export const dynamic = "force-dynamic";

interface Trash {
  jobs: { id: string; jobId: string; title: string; deletedAt: string; _count: { applications: number } }[];
  candidates: {
    id: string;
    name: string;
    phone: string;
    deletedAt: string;
    applications: { jobOpening: { jobId: string } }[];
  }[];
}

const deletedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export default async function TrashPage() {
  if ((await getSession()).role !== "ADMIN") redirect("/admin");
  const trash = await apiGet<Trash>("/trash");
  const empty = trash.jobs.length === 0 && trash.candidates.length === 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Trash</h1>
      <p className="mt-1 text-sm text-mid">
        Deleted jobs and candidates stay here, hidden everywhere else, until you restore them or delete them for good.
      </p>

      {empty ? (
        <div className="card mt-5 p-6 text-center">
          <h2 className="font-extrabold">Trash is empty</h2>
          <p className="mt-2 text-sm text-body">Anything you delete will wait here first.</p>
        </div>
      ) : (
        <>
          <Group title="Jobs" count={trash.jobs.length}>
            {trash.jobs.map((job) => (
              <li key={job.id} className="card p-4">
                <p className="font-bold">{job.title}</p>
                <p className="mt-0.5 text-xs text-mid">
                  <span className="font-mono">{job.jobId}</span> · {job._count.applications} application
                  {job._count.applications === 1 ? "" : "s"} · deleted {deletedOn(job.deletedAt)}
                </p>
                <TrashActions
                  kind="jobs"
                  id={job.id}
                  label={job.title}
                  eraseWarning={`This erases the job, all ${job._count.applications} of its applications and their CVs, and any candidate who applied to nothing else. It cannot be undone.`}
                />
              </li>
            ))}
          </Group>

          <Group title="Candidates" count={trash.candidates.length}>
            {trash.candidates.map((candidate) => (
              <li key={candidate.id} className="card p-4">
                <p className="font-bold">{candidate.name}</p>
                <p className="mt-0.5 text-xs text-mid">
                  <span className="font-mono">{candidate.phone}</span>
                  {candidate.applications.length > 0 &&
                    ` · ${candidate.applications.map((a) => a.jobOpening.jobId).join(", ")}`}{" "}
                  · deleted {deletedOn(candidate.deletedAt)}
                </p>
                <TrashActions
                  kind="candidates"
                  id={candidate.id}
                  label={candidate.name}
                  eraseWarning={`This erases ${candidate.name}, every application, CV and note. It cannot be undone.`}
                />
              </li>
            ))}
          </Group>
        </>
      )}
    </main>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-extrabold">
        {title} <span className="tnum text-mid">{count}</span>
      </h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}
