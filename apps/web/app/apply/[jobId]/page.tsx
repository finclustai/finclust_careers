import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Briefcase, Clock, MapPin } from "lucide-react";
import {
  EMPLOYMENT_LABEL,
  WORK_MODE_LABEL,
  experienceBand,
  fetchOpenJobs,
  fetchOpening,
} from "@/lib/api";
import { OpenRoles } from "@/components/job-card";
import { TrustLine } from "@/components/trust-line";
import { Description } from "@/components/description";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ source?: string }>;
}

/**
 * Reads from the open-roles list rather than the apply endpoint. The apply
 * endpoint records a link click, and rendering metadata is not a click -- using
 * it here counted every visit twice.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const job = (await fetchOpenJobs())?.find((j) => j.jobId === jobId.toUpperCase());
  if (!job) return { title: "Opening not available" };

  const facts = [job.location, experienceBand(job), job.client].filter(Boolean).join(" · ");
  const description = `${facts ? `${facts}. ` : ""}Apply in about a minute with your CV.`;

  return {
    title: job.title,
    description,
    // Next.js replaces these objects rather than merging them with the layout's,
    // so the site name and large-card type are restated or they are lost.
    openGraph: {
      title: `${job.title} — FINCLUST Careers`,
      description,
      siteName: "FINCLUST Careers",
      type: "website",
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: `${job.title} — FINCLUST Careers`, description },
  };
}

export default async function ApplyPage({ params, searchParams }: Props) {
  const { jobId } = await params;
  const { source } = await searchParams;
  const result = await fetchOpening(jobId, source);

  if (!result.ok) {
    // A closed or unknown job is a dead end on its own. Showing what is still
    // open turns it into a second chance for the candidate who followed an old link.
    const others = (await fetchOpenJobs()) ?? [];
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="card mx-auto max-w-md p-6 text-center">
          <h1 className="text-xl font-extrabold">
            {result.status === 410 ? "This opening has closed" : "Opening not found"}
          </h1>
          <p className="mt-2 text-sm text-body">{result.message}</p>
        </div>

        {others.length > 0 && (
          <div className="mt-8">
            <OpenRoles jobs={others} heading="Other open roles" source={source} />
          </div>
        )}
      </main>
    );
  }

  const job = result.job;
  const band = experienceBand(job);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link href="/" className="text-link text-mid">
        <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
        All open roles
      </Link>

      <header className="mb-6 mt-2">
        <TrustLine />

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
          {job.employmentType && <span className="chip">{EMPLOYMENT_LABEL[job.employmentType]}</span>}
        </div>

        {job.client && (
          <p className="mt-4 text-sm text-body">
            Hiring for <strong className="font-bold text-ink">{job.client}</strong>
          </p>
        )}

        {job.description && (
          <div className="mt-4">
            <Description text={job.description} />
          </div>
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

      <ApplyForm jobId={job.jobId} source={source} noteEnabled={job.candidateNoteEnabled} />
    </main>
  );
}
