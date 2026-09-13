"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { SOURCE_LABEL } from "@/lib/status";

interface Share {
  links: { source: string; url: string; clickCount: number }[];
  whatsappMessage: string;
  whatsappShareUrl: string;
}

/**
 * Nothing is sent from here (ADR-0005). The post is composed for a human to
 * paste into a group, because no Meta API can post to a WhatsApp group.
 */
export function ShareKit({ share }: { share: Share }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Clipboard is blocked in some browsers. The text stays selectable.
    }
  }

  return (
    <>
      <section className="card mt-5 p-4">
        <h2 className="text-sm font-extrabold">Share on WhatsApp</h2>
        <p className="hint">
          Copy this and paste it into your groups. Nothing is sent automatically.
        </p>

        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-[10px] border-2 border-ink bg-sand p-3 font-sans text-xs leading-relaxed">
          {share.whatsappMessage}
        </pre>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(share.whatsappMessage, "message")}
            className="btn btn-primary flex-1"
          >
            {copied === "message" ? (
              <>
                <Check size={17} strokeWidth={2.5} aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy size={17} strokeWidth={2.5} aria-hidden /> Copy post
              </>
            )}
          </button>
          <a
            href={share.whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary flex-1"
          >
            <MessageCircle size={17} strokeWidth={2.5} aria-hidden />
            Open WhatsApp
          </a>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-extrabold">Application links</h2>
        <p className="hint">
          One per source. Whichever a candidate uses is recorded against their application.
        </p>

        <ul className="mt-3 space-y-2">
          {share.links.map((link) => (
            <li
              key={link.source}
              className="flex items-center gap-2 rounded-[10px] border-2 border-ink bg-paper p-2"
            >
              <span className="w-[74px] shrink-0 text-xs font-bold">
                {SOURCE_LABEL[link.source] ?? link.source}
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-mid">
                {link.url}
              </code>
              <span className="tnum shrink-0 text-xs text-mid" title="Link opens">
                {link.clickCount}
              </span>
              <button
                type="button"
                onClick={() => copy(link.url, link.source)}
                aria-label={`Copy the ${SOURCE_LABEL[link.source] ?? link.source} link`}
                className="icon-button shrink-0 border-2 border-ink bg-sand"
              >
                {copied === link.source ? (
                  <Check size={14} strokeWidth={2.5} aria-hidden />
                ) : (
                  <Copy size={14} strokeWidth={2.5} aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
