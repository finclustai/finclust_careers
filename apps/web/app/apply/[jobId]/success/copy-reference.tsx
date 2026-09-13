"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard is blocked in some mobile browsers. The reference is on
      // screen and selectable either way, so this fails quietly.
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-secondary mt-4 w-full">
      {copied ? (
        <>
          <Check size={17} strokeWidth={2.5} aria-hidden />
          Copied
        </>
      ) : (
        <>
          <Copy size={17} strokeWidth={2.5} aria-hidden />
          Copy reference
        </>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "Reference copied to clipboard" : ""}
      </span>
    </button>
  );
}
