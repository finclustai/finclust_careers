import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import { SOURCE_LABEL, STATUS_STYLE, type ApplicationStatus } from "@/lib/status";
import { StatusControl } from "./actions";
import { ResumePreview } from "./resume-preview";
import { WhatsAppButton } from "@/components/whatsapp-button";

export const dynamic = "force-dynamic";

interface Detail {
  id: string;
  applicationReference: string;
  status: ApplicationStatus;
  source: string;
  appliedAt: string;
  candidate: {
    name: string;
    phone: string;
    email: string | null;
    location: string | null;
    totalExperience: string | number | null;
    currentCompany: string | null;
    noticePeriod: string | null;
    expectedSalary: string | null;
    linkedinUrl: string | null;
    whatsappOptIn: boolean;
  };
  jobOpening: { id: string; jobId: string; title: string; client: string | null };
  assignedRecruiter: { id: string; name: string } | null;
  resume: { originalFileName: string; fileSize: number; uploadedAt: string } | null;
  statusHistory: {
    id: string;
    previousStatus: ApplicationStatus | null;
    newStatus: ApplicationStatus;
    comment: string | null;
    changedAt: string;
    changedBy: { name: string };
  }[];
}

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await apiGet<Detail>(`/applications/${id}`);
  const c = app.candidate;
  const style = STATUS_STYLE[app.status];

  const facts: [string, string | null][] = [
    ["Email", c.email],
    ["Location", c.location],
    ["Experience", c.totalExperience != null ? `${c.totalExperience} years` : null],
    ["Current company", c.currentCompany],
    ["Notice period", c.noticePeriod],
    ["Expected salary", c.expectedSalary],
    ["WhatsApp updates", c.whatsappOptIn ? "Opted in" : "Not opted in"],
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Link
        href="/admin/applications"
        className="text-link text-mid"
      >
        <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
        All applications
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{c.name}</h1>
            <p className="mt-1 font-mono text-sm text-mid">{c.phone}</p>
            <p className="mt-1 font-mono text-xs text-mid">{app.applicationReference}</p>
          </div>
          <WhatsAppButton
            size="md"
            phone={c.phone}
            candidateName={c.name}
          />
        </div>
        <span className={`chip ${style.chip} !px-3 !py-1.5`}>
          <span className={`size-2 rounded-full ${style.dot}`} aria-hidden />
          {style.label}
        </span>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-extrabold">Applied for</h2>
            <p className="mt-2 text-sm font-semibold">{app.jobOpening.title}</p>
            <p className="mt-0.5 font-mono text-xs text-mid">{app.jobOpening.jobId}</p>
            {app.jobOpening.client && <p className="mt-1 text-xs text-body">{app.jobOpening.client}</p>}
            <p className="mt-2 text-xs text-mid">
              via {SOURCE_LABEL[app.source] ?? app.source} ·{" "}
              {new Date(app.appliedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
            <Link
              href={`/admin/jobs/${app.jobOpening.id}/board`}
              className="text-link underline decoration-orange decoration-2 underline-offset-4"
            >
              Open pipeline board
            </Link>
          </section>

          <section className="card p-4">
            <StatusControl applicationId={app.id} current={app.status} />
          </section>
          <section className="card p-4">
            <h2 className="text-sm font-extrabold">Candidate details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-bold uppercase tracking-wider text-mid">{label}</dt>
                  <dd className="mt-0.5 break-words">{value ?? <span className="text-placeholder">Not given</span>}</dd>
                </div>
              ))}
            </dl>
            {c.linkedinUrl && (
              <a
                href={c.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-link underline decoration-orange decoration-2 underline-offset-4"
              >
                LinkedIn profile
              </a>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-extrabold">History</h2>
            {app.statusHistory.length === 0 ? (
              <p className="hint">No status changes yet. This application is still new.</p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {app.statusHistory.map((entry) => (
                  <li key={entry.id} className="flex gap-2.5 text-sm">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_STYLE[entry.newStatus].dot}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p>
                        <span className="font-semibold">
                          {entry.previousStatus ? STATUS_STYLE[entry.previousStatus].label : "Created"}
                        </span>
                        {" → "}
                        <span className="font-semibold">{STATUS_STYLE[entry.newStatus].label}</span>
                      </p>
                      <p className="text-xs text-mid">
                        {entry.changedBy.name} ·{" "}
                        {new Date(entry.changedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {entry.comment && <p className="mt-1 text-xs text-body">{entry.comment}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>


        {app.resume ? (
          <ResumePreview
            applicationId={app.id}
            fileName={app.resume.originalFileName}
            fileSize={app.resume.fileSize}
          />
        ) : (
          <section className="card flex min-h-[300px] items-center justify-center p-6 text-center">
            <p className="text-sm text-mid">No CV attached to this application.</p>
          </section>
        )}
      </div>
    </main>
  );
}
