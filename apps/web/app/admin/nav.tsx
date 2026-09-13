"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/applications", label: "Applications" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex min-w-0 gap-1.5">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex min-h-[44px] items-center rounded-[10px] border-2 px-3.5 text-[13px] font-bold transition-colors",
              active
                ? "border-ink bg-orange-tint"
                : "border-transparent text-mid hover:border-ink hover:bg-sand",
            ].join(" ")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
