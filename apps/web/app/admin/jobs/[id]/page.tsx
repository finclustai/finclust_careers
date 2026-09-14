import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import QRCode from "qrcode";
import { apiGet, getSession } from "@/lib/server-api";
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
  candidateNoteEnabled: boolean;
  closesAt: string | null;
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
  const [job, user] = await Promise.all([apiGet<JobDetail>(`/jobs/${id}`), getSession()]);
  // For posters and screens. Uses the "Other" link so QR applications are
  // counted separately from WhatsApp and LinkedIn.
  const qrLink = job.share.links.find((l) => l.source === "OTHER")?.url;
  const qr = qrLink ? await QRCode.toDataURL(qrLink, { margin: 2, width: 480, color: { dark: "#15140f" } }) : null;

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
          <p className="mt-1 text-xs text-mid">
            Candidate note box {job.candidateNoteEnabled ? "on" : "off"}
            {job.closesAt &&
              ` · closes ${new Date(job.closesAt).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}`}
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

      {user.role === "ADMIN" && (
        <JobControls
          jobId={job.id}
          title={job.title}
          status={job.status as "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED"}
        />
      )}

      {job.status === "ACTIVE" && <ShareKit share={job.share} />}

      {job.status === "ACTIVE" && qr && (
        <section className="card mt-4 flex flex-wrap items-center gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, nothing to optimise */}
          <img src={qr} alt={`QR code that opens the application page for ${job.title}`} width={140} height={140} className="rounded-[10px] border-2 border-ink" />
          <div className="min-w-0 flex-1 basis-48">
            <h2 className="text-sm font-extrabold">QR code</h2>
            <p className="hint">For posters, screens and events. Scanning it opens the application page.</p>
            <a href={qr} download={`${job.jobId}-apply-qr.png`} className="btn btn-secondary mt-3">
              Download QR image
            </a>
          </div>
        </section>
      )}

      {job.description && (
        <section className="card mt-4 p-4">
          <h2 className="text-sm font-extrabold">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-body">{job.description}</p>
        </section>
      )}
    </main>
  );
}
