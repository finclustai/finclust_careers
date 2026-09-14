"use client";

import { useEffect } from "react";

/**
 * Records the visit after the dashboard has rendered its "new" counts, so the
 * next visit counts from now. Done from the browser, not while rendering, so a
 * prefetch or a failed render never swallows the badges.
 */
export function MarkSeen() {
  useEffect(() => {
    void fetch("/api/dashboard/seen", { method: "POST" });
  }, []);
  return null;
}
