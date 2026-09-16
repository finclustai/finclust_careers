import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How FINCLUST handles the information you share when you apply for a role.",
};

// Describes only what this system actually does. Anything that is a policy
// decision rather than a technical fact (retention periods, a named contact)
// belongs to FINCLUST to set, not to the code.
const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "What we collect",
    body: (
      <>
        Your name, mobile number, city and experience; your CV; anything else you choose to add, such as
        email, current company, notice period, expected salary, LinkedIn profile or a note to the recruiter;
        and which link you used to reach the application.
      </>
    ),
  },
  {
    heading: "Why we collect it",
    body: (
      <>
        To consider you for the role you applied to and, where relevant, for other roles at FINCLUST or its
        clients. If you tick the WhatsApp option, we may also message you about openings that match your profile.
      </>
    ),
  },
  {
    heading: "Who can see it",
    body: (
      <>
        Only FINCLUST's recruitment team, through a signed-in console. Your CV is stored privately and is
        never publicly accessible; recruiters open it through links that expire within a minute. If you send
        a Word CV, it is displayed to the team using Microsoft&apos;s online document viewer, which reads the
        file through that short-lived link and does not keep it.
      </>
    ),
  },
  {
    heading: "Where it is stored",
    body: <>In secure cloud databases and file storage hosted in India.</>,
  },
  {
    heading: "Your choices",
    body: (
      <>
        You can ask us to stop WhatsApp messages at any time, or ask for your application and CV to be deleted.
        When we act on a deletion request, your details and CV files are permanently erased.
      </>
    ),
  },
  {
    heading: "Contact",
    body: (
      <>
        To ask about or remove your information, contact FINCLUST through{" "}
        <a
          href={BRAND.mainSite}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ink underline decoration-orange decoration-2 underline-offset-2"
        >
          {BRAND.mainSiteLabel}
        </a>{" "}
        and quote your application reference if you have one.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link href="/" className="text-link text-mid">
        <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
        All open roles
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold">Privacy notice</h1>
      <p className="mt-2 text-body">
        How {BRAND.name} handles the information you share when you apply for a role.
      </p>

      <div className="card mt-6 divide-y-2 divide-line p-0">
        {SECTIONS.map((section) => (
          <section key={section.heading} className="p-5">
            <h2 className="text-base font-extrabold">{section.heading}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-body">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
