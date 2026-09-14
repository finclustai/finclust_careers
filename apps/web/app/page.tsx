import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { fetchOpenJobs } from "@/lib/api";
import { OpenRoles } from "@/components/job-card";
import { TrustLine } from "@/components/trust-line";

// Rendered per request so a build-time or failed fetch is never frozen into the
// page; the fetch itself is cached for 60s, so this is still one API call a minute.
export const dynamic = "force-dynamic";

export default async function Home() {
  const jobs = await fetchOpenJobs();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-mid">FINCLUST</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Careers</h1>
        <p className="mt-2 max-w-xl text-body">
          Browse open roles and apply in about a minute with your CV. No account needed.
        </p>
        <div className="mt-3">
          <TrustLine />
        </div>
      </header>

      <OpenRoles jobs={jobs} />

      <div className="mt-10 flex flex-col items-center gap-1 text-sm text-mid sm:flex-row sm:justify-center sm:gap-6">
        <Link href="/status" className="text-link text-ink">
          <Search size={14} strokeWidth={2.5} aria-hidden />
          Check an application
        </Link>
        <p>
          Recruiter or admin?{" "}
          <Link
            href="/login"
            className="text-link text-ink underline decoration-orange decoration-2 underline-offset-4"
          >
            Sign in
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        </p>
      </div>
    </main>
  );
}
