import Link from "next/link";
import { ArrowRight, Briefcase, Clock, MapPin } from "lucide-react";
import { EMPLOYMENT_LABEL, WORK_MODE_LABEL, experienceBand, type PublicJob } from "@/lib/api";

export function JobCard({ job, source = "website" }: { job: PublicJob; source?: string }) {
  const band = experienceBand(job);
  const href = `/apply/${job.jobId}?source=${source}`;

  return (
    <li className="card flex flex-col p-4 transition-shadow hover:shadow-[0_3px_0_var(--color-ink)]">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-mid">{job.profile.name}</p>

      {/* The title is not a link: the full-width button below goes to the same
          page, and two links to one destination is two tab stops for nothing. */}
      <h3 className="mt-1.5 text-lg font-extrabold leading-snug">{job.title}</h3>

      {job.client && <p className="mt-1 text-sm text-body">{job.client}</p>}

      <ul className="mb-4 mt-3 flex flex-wrap gap-1.5" aria-label="Role details">
        {job.location && (
          <li className="chip">
            <MapPin size={13} strokeWidth={2} aria-hidden />
            {job.location}
            {job.workMode ? ` · ${WORK_MODE_LABEL[job.workMode]}` : ""}
          </li>
        )}
        {band && (
          <li className="chip">
            <Clock size={13} strokeWidth={2} aria-hidden />
            {band}
          </li>
        )}
        {job.employmentType && (
          <li className="chip">
            <Briefcase size={13} strokeWidth={2} aria-hidden />
            {EMPLOYMENT_LABEL[job.employmentType]}
          </li>
        )}
      </ul>

      {/* The whole bottom of the card is the tap target on a phone. */}
      <Link href={href} className="btn btn-primary mt-auto w-full" aria-label={`View and apply: ${job.title}`}>
        View and apply
        <ArrowRight size={17} strokeWidth={2.5} aria-hidden />
      </Link>
    </li>
  );
}

export function OpenRoles({
  jobs,
  heading = "Open roles",
  source,
}: {
  jobs: PublicJob[] | null;
  heading?: string;
  source?: string;
}) {
  if (jobs === null) {
    return (
      <div className="card p-6 text-center">
        <h2 className="font-extrabold">Roles couldn&apos;t load just now</h2>
        <p className="mt-2 text-sm text-body">This is usually brief. Refresh the page in a moment.</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card p-6 text-center">
        <h2 className="font-extrabold">No open roles right now</h2>
        <p className="mt-2 text-sm text-body">
          New openings are shared here first. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="open-roles">
      <h2 id="open-roles" className="mb-3 flex items-baseline justify-between text-xl font-extrabold">
        {heading}
        <span className="tnum text-sm font-bold text-mid">{jobs.length}</span>
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.jobId} job={job} source={source} />
        ))}
      </ul>
    </section>
  );
}
