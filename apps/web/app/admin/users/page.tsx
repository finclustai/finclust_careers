import { redirect } from "next/navigation";
import { apiGet, getSession } from "@/lib/server-api";
import { AddUser, UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECRUITER";
  isActive: boolean;
  _count: { assignedApplications: number };
}

export default async function UsersPage() {
  const me = await getSession();
  if (me.role !== "ADMIN") redirect("/admin");
  const users = await apiGet<User[]>("/users");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Users</h1>
      <p className="mt-1 text-sm text-mid">
        Admins see and manage everything. Recruiters see only applications assigned to them.
      </p>

      <AddUser />

      <ul className="mt-5 space-y-3">
        {users.map((user) => (
          <li key={user.id} className={`card p-4 ${user.isActive ? "" : "opacity-70"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">
                  {user.name}
                  {user.id === me.id && <span className="text-mid"> (you)</span>}
                </p>
                <p className="truncate text-xs text-mid">{user.email}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <span className={`chip ${user.role === "ADMIN" ? "bg-orange-tint" : "bg-sand"}`}>
                  {user.role === "ADMIN" ? "Admin" : "Recruiter"}
                </span>
                {!user.isActive && <span className="chip border-dashed">Deactivated</span>}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-body">
              <span className="tnum">{user._count.assignedApplications}</span> assigned application
              {user._count.assignedApplications === 1 ? "" : "s"}
            </p>
            {user.id !== me.id && <UserActions user={user} />}
          </li>
        ))}
      </ul>
    </main>
  );
}
