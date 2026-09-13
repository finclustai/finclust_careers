import { Briefcase, Clock, MapPin } from "lucide-react";
import {
  EMPLOYMENT_LABEL,
  WORK_MODE_LABEL,
  experienceBand,
  fetchOpening,
} from "@/lib/api";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ source?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { jobId } = await params;
  const result = await fetchOpening(jobId);
  return {
    title: result.ok ? `${result.job.title} — FINCLUST` : "Opening not available — FINCLUST",
  };
}

export default async function ApplyPage({ params, searchParams }: Props) {
  const { jobId } = await params;
  const { source } = await searchParams;
  const result = await fetchOpening(jobId, source);

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <div className="card p-6 text-center">
          <h1 className="text-xl font-extrabold">
            {result.status === 410 ? "This opening has closed" : "Opening not found"}
          </h1>
          <p className="mt-2 text-sm text-body">{result.message}</p>
          <p className="hint mt-4">
            If a recruiter sent you this link, reply to them and ask for a current one.
          </p>
        </div>
      </main>
    );
  }

  const job = result.job;
  const band = experienceBand(job);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-mid">
          FINCLUST Recruitment
        </p>

        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{job.title}</h1>

        <p className="mt-2 font-mono text-sm text-mid">{job.jobId}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">
            <Briefcase size={14} strokeWidth={2} aria-hidden />
            {job.profile.name}
          </span>
          {job.location && (
            <span className="chip">
              <MapPin size={14} strokeWidth={2} aria-hidden />
              {job.location}
              {job.workMode ? ` · ${WORK_MODE_LABEL[job.workMode]}` : ""}
            </span>
          )}
          {band && (
            <span className="chip">
              <Clock size={14} strokeWidth={2} aria-hidden />
              {band}
            </span>
          )}
          {job.employmentType && (
            <span className="chip">{EMPLOYMENT_LABEL[job.employmentType]}</span>
          )}
        </div>

        {job.client && (
          <p className="mt-4 text-sm text-body">
            Hiring for <strong className="font-bold text-ink">{job.client}</strong>
          </p>
        )}

        {job.description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-body">
            {job.description}
          </p>
        )}

        {job.requiredSkills.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-mid">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {job.requiredSkills.map((skill) => (
                <span key={skill} className="chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      <ApplyForm jobId={job.jobId} source={source} />
    </main>
  );
}
