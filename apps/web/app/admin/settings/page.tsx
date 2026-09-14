import { redirect } from "next/navigation";
import { apiGet, getSession } from "@/lib/server-api";
import { TemplateEditor } from "./template-editor";

export const dynamic = "force-dynamic";

interface Setup {
  enabled: boolean;
  mailbox: string | null;
  template: { subject: string; body: string };
}

export default async function SettingsPage() {
  const user = await getSession();
  if (user.role !== "ADMIN") redirect("/admin");
  const setup = await apiGet<Setup>("/shares/setup");

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      <section className="card mt-5 p-4">
        <h2 className="text-sm font-extrabold">Zoho Mail</h2>
        <p className="mt-1 text-sm">
          {setup.enabled && setup.mailbox ? (
            <>
              <span className="chip bg-green-tint">Connected</span> Drafts are created in <strong>{setup.mailbox}</strong>.
            </>
          ) : (
            <>
              <span className="chip border-dashed">Not connected</span> Sharing CVs by email is switched off.
            </>
          )}
        </p>
      </section>

      <TemplateEditor initial={setup.template} senderName={user.name} />
    </main>
  );
}
