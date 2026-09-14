import Link from "next/link";
import { CheckCircle2, MessageCircle, Search } from "lucide-react";
import { CopyReference } from "./copy-reference";

export const dynamic = "force-dynamic";

export const metadata = { title: "Application received — FINCLUST" };

interface Props {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ ref?: string; title?: string; again?: string }>;
}

export default async function SuccessPage({ searchParams }: Props) {
  const { ref, title, again } = await searchParams;

  if (!ref) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <div className="card p-6 text-center">
          <h1 className="text-xl font-extrabold">Nothing to show here</h1>
          <p className="mt-2 text-sm text-body">
            Open the link your recruiter sent you to apply.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="card overflow-hidden">
        <div className="border-b-2 border-ink bg-green-tint px-6 py-7 text-center">
          <CheckCircle2 size={40} strokeWidth={2} aria-hidden className="mx-auto" />
          <h1 className="mt-3 text-2xl font-extrabold">
            {again ? "You have already applied" : "Application received"}
          </h1>
          {title && <p className="mt-1.5 text-sm font-semibold text-body">{title}</p>}
        </div>

        <div className="px-6 py-7">
          {/* The stamped ticket. The one deliberate flourish in the product: no
              recruiter and no client ever sees this screen. */}
          <div className="relative">
            <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-mid">
              Application reference
            </p>

            <div className="mt-2.5 rounded-[10px] border-2 border-dashed border-ink bg-sand px-3 py-4">
              <p className="text-center font-mono text-[clamp(0.95rem,4.4vw,1.25rem)] font-medium tracking-tight">
                {ref}
              </p>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute -right-1 -top-6 rotate-[9deg] rounded-[6px] border-2 border-ink px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-85"
            >
              Received
            </div>
          </div>

          <CopyReference reference={ref} />

          {/* People close this tab and lose the reference. Sending it to their
              own WhatsApp ("Message yourself") keeps it somewhere they will find
              it. wa.me with no number opens the chat picker, so no phone number
              has to travel in this page's URL. */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `My FINCLUST application${title ? ` for ${title}` : ""}
Reference: ${ref}
Check status: https://careers.finclust.ai/status`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-2.5 w-full"
          >
            <MessageCircle size={17} strokeWidth={2.5} aria-hidden />
            Save to my WhatsApp
          </a>

          {again ? (
            <p className="mt-6 text-sm leading-relaxed text-body">
              We already have your CV for this role, so nothing further is needed.
            </p>
          ) : (
            <div className="mt-6">
              <h2 className="text-sm font-extrabold">What happens next</h2>
              <ol className="mt-3 space-y-3">
                {[
                  ["Review", "A recruiter reviews your CV against the role."],
                  ["Shortlist", "If your experience matches, we contact you on the number you gave."],
                  ["Interview", "Shortlisted candidates are invited to interview."],
                ].map(([step, text], i) => (
                  <li key={step} className="flex gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sand text-xs font-extrabold">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-bold">{step}.</span>{" "}
                      <span className="text-body">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1 text-sm">
        <Link href="/status" className="text-link text-ink">
          <Search size={14} strokeWidth={2.5} aria-hidden />
          Check your application status any time
        </Link>
        <Link href="/" className="text-link text-mid">
          See other open roles
        </Link>
      </div>
    </main>
  );
}
