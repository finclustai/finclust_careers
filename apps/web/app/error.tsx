"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";

// Shown when a page fails to render. Offers a retry first, because the most
// common cause is a brief database or network blip that a second attempt clears.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 text-center">
        <h1 className="text-2xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 text-sm text-body">
          This is usually brief. Try again, and if it keeps happening, come back in a few minutes.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary mt-5 w-full">
          <RotateCw size={17} strokeWidth={2.5} aria-hidden />
          Try again
        </button>
        <Link href="/" className="text-link mt-2 justify-center text-mid">
          Back to open roles
        </Link>
      </div>
    </main>
  );
}
