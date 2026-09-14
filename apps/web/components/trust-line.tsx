import { ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/site";

/**
 * Job links arrive in WhatsApp groups, which are a common channel for fake job
 * offers. Saying plainly that this is FINCLUST's own page, and linking to the
 * main site, gives a wary candidate a way to check before sharing their CV.
 */
export function TrustLine() {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-mid">
      <ShieldCheck size={14} strokeWidth={2.25} aria-hidden className="shrink-0 text-ink" />
      <span>Official {BRAND.site} page</span>
      <span aria-hidden>·</span>
      <a
        href={BRAND.mainSite}
        target="_blank"
        rel="noopener noreferrer"
        className="-my-3 inline-flex min-h-[44px] items-center px-1 font-semibold text-ink underline decoration-orange decoration-2 underline-offset-2"
      >
        {BRAND.mainSiteLabel}
      </a>
    </p>
  );
}
