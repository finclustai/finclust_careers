"use client";

import { MessageCircle } from "lucide-react";
import { whatsappChatUrl } from "@/lib/whatsapp";

export function WhatsAppButton({
  phone,
  candidateName,
  size = "sm",
}: {
  phone: string;
  candidateName?: string;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? 14 : 17;
  return (
    <a
      href={whatsappChatUrl(phone, candidateName)}
      target="_blank"
      rel="noopener noreferrer"
      // Stops a click reaching the board card behind it, whose double-click
      // opens the candidate. That handler is why this is a client component.
      onClick={(event) => event.stopPropagation()}
      aria-label={`Message ${candidateName ?? phone} on WhatsApp`}
      title={`Message ${candidateName ?? phone} on WhatsApp`}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-[8px] border-2 border-ink bg-green-tint",
        // A thumb needs 44px; a mouse does not, so it shrinks on wider screens
        // where it sits in a dense table row.
        size === "sm" ? "size-11 md:size-9" : "size-11",
      ].join(" ")}
    >
      <MessageCircle size={px} strokeWidth={2.5} aria-hidden />
    </a>
  );
}
