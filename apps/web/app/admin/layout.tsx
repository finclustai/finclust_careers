import Link from "next/link";
import { LogOut } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import { AdminNav } from "./nav";

export const dynamic = "force-dynamic";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECRUITER";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Every admin route resolves the session here. apiGet redirects to the login
  // page on 401, so no page below this needs its own auth check.
  const user = await apiGet<SessionUser>("/auth/me");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4">
          <Link href="/admin/jobs" className="inline-flex min-h-[44px] shrink-0 items-center font-extrabold tracking-tight">
            FINCLUST
          </Link>
          <AdminNav />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-bold">{user.name}</span>
              <span className="block text-mid">
                {user.role === "ADMIN" ? "Admin" : "Recruiter"}
              </span>
            </span>
            <a
              href="/admin/signout"
              className="inline-flex min-h-[44px] items-center rounded-[10px] border-2 border-ink bg-paper px-3.5 text-[13px] font-bold"
            >
              <span className="hidden sm:inline">Sign out</span>
              <LogOut size={17} strokeWidth={2.5} aria-hidden className="sm:hidden" />
              <span className="sr-only sm:hidden">Sign out</span>
            </a>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
