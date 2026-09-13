import { CheckCircle2 } from "lucide-react";
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

          <p className="mt-6 text-sm leading-relaxed text-body">
            {again
              ? "We already have your CV for this role, so nothing further is needed. Keep this reference for your records."
              : "Our recruitment team will review your profile and contact you if your experience matches the requirement."}
          </p>

          <p className="hint mt-4">
            Save this reference. Quote it if you contact us about this application.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.14em] text-mid">
        FINCLUST Recruitment
      </p>
    </main>
  );
}
