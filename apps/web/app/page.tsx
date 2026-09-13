import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-mid">FINCLUST</p>
        <h1 className="mt-3 text-2xl font-extrabold">Careers</h1>
        <p className="mt-2 text-sm text-body">
          Open the link a recruiter sent you to apply for a role.
        </p>
      </div>

      {/* Deliberately quiet: candidates are the audience for this page, and the
          sign-in is for the handful of people who run the console. */}
      <p className="mt-5 text-center text-sm text-mid">
        Recruiter or admin?{" "}
        <Link
          href="/login"
          className="text-link text-ink underline decoration-orange decoration-2 underline-offset-4"
        >
          Sign in
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
        </Link>
      </p>
    </main>
  );
}
