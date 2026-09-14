import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiGet, getSession } from "@/lib/server-api";
import { SOURCE_LABEL, STATUS_STYLE, type ApplicationStatus } from "@/lib/status";
import { AssignControl, DeleteCandidate, Notes, StatusControl, StepNav } from "./actions";
import { ResumePreview } from "./resume-preview";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { ShareButton } from "@/components/share-button";

export const dynamic = "force-dynamic";

interface Detail {
  id: string;
  applicationReference: string;
  status: ApplicationStatus;
  source: string;
  appliedAt: string;
  candidateNote: string | null;
  cvShareItems: {
    share: { id: string; createdAt: string; toAddresses: string[]; ccAddresses: string[]; createdBy: { name: string } };
  }[];
  previousId: string | null;
  nextId: string | null;
  otherApplications: {
    id: string;
    status: ApplicationStatus;
    appliedAt: string;
    jobOpening: { jobId: string; title: string };
  }[];
  candidate: {
    id: string;
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
    notes: { id: string; body: string; createdAt: string; author: { name: string } }[];
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
  const [app, user] = await Promise.all([apiGet<Detail>(`/applications/${id}`), getSession()]);
  const isAdmin = user.role === "ADMIN";
  const people = isAdmin ? await apiGet<{ id: string; name: string }[]>("/recruiters") : [];
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/applications" className="text-link text-mid">
          <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
          All applications
        </Link>
        <StepNav previousId={app.previousId} nextId={app.nextId} />
      </div>

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
            {isAdmin ? (
              <AssignControl applicationId={app.id} current={app.assignedRecruiter?.id ?? null} people={people} />
            ) : null}
          </section>

          {app.candidateNote && (
            <section className="card p-4">
              <h2 className="text-sm font-extrabold">Note from the candidate</h2>
              <blockquote className="mt-2 whitespace-pre-line break-words border-l-4 border-orange pl-3 text-sm text-body">
                {app.candidateNote}
              </blockquote>
            </section>
          )}

          <section className="card p-4">
            <StatusControl applicationId={app.id} current={app.status} />
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-extrabold">Share with a client</h2>
            <p className="hint mb-3">Creates a draft in Zoho Mail with this CV attached.</p>
            {app.resume ? (
              <ShareButton applicationId={app.id} name={c.name} />
            ) : (
              <p className="text-sm text-mid">No CV to share.</p>
            )}
            {app.cvShareItems.length > 0 && (
              <ul className="mt-3 space-y-2 border-t-2 border-line pt-3">
                {app.cvShareItems.map(({ share }) => (
                  <li key={share.id} className="text-sm">
                    <p className="break-words font-semibold">{[...share.toAddresses, ...share.ccAddresses].join(", ")}</p>
                    <p className="text-xs text-mid">
                      {share.createdBy.name} ·{" "}
                      {new Date(share.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
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

          {app.otherApplications.length > 0 && (
            <section className="card p-4">
              <h2 className="text-sm font-extrabold">Also applied to</h2>
              <ul className="mt-2 divide-y-2 divide-line">
                {app.otherApplications.map((other) => (
                  <li key={other.id}>
                    <Link href={`/admin/applications/${other.id}`} className="flex min-h-[48px] items-center gap-3 py-1.5 hover:bg-sand">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{other.jobOpening.title}</span>
                        <span className="block font-mono text-xs text-mid">{other.jobOpening.jobId}</span>
                      </span>
                      <span className={`chip shrink-0 ${STATUS_STYLE[other.status].chip}`}>{STATUS_STYLE[other.status].label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Notes applicationId={app.id} initial={app.candidate.notes} />

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

          {isAdmin && (
            <DeleteCandidate
              candidateId={app.candidate.id}
              name={c.name}
              applicationCount={app.otherApplications.length + 1}
            />
          )}
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
