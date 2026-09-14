import Link from "next/link";
import { LogOut } from "lucide-react";
import { getSession } from "@/lib/server-api";
import { AdminNav } from "./nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Every admin route resolves the session here. apiGet redirects to the login
  // page on 401, so no page below this needs its own auth check.
  const user = await getSession();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-3 pt-1.5 sm:flex-nowrap sm:px-4 sm:py-2">
          <Link href="/admin" className="inline-flex min-h-[44px] shrink-0 items-center font-extrabold tracking-tight">
            FINCLUST
          </Link>
          <div className="order-last -mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 pb-1.5 [scrollbar-width:none] sm:order-none sm:mx-0 sm:w-auto sm:min-w-0 sm:p-0">
            <AdminNav isAdmin={user.role === "ADMIN"} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-right text-xs leading-tight lg:block">
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
