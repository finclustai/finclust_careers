"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/board", label: "Board" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/users", label: "Users", adminOnly: true },
  { href: "/admin/trash", label: "Trash", adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex gap-1.5">
      {LINKS.filter((link) => isAdmin || !link.adminOnly).map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex min-h-[44px] shrink-0 items-center rounded-[10px] border-2 px-3 text-[13px] font-bold transition-colors",
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
