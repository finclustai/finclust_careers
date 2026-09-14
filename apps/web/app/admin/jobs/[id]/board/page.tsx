import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/server-api";
import { Board, type Card } from "./board";

export const dynamic = "force-dynamic";

interface BoardData {
  job: { id: string; jobId: string; title: string; client: string | null; status: string };
  cards: Card[];
  counts: Record<string, number>;
  columnPageSize: number;
}

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiGet<BoardData>(`/applications/board/${id}`);
  const total = Object.values(data.counts).reduce((sum, n) => sum + n, 0);

  return (
    <main className="min-h-dvh overflow-x-clip px-4 py-6">
      <header className="mb-5">
        <Link
          href="/admin/jobs"
          className="text-link text-mid"
        >
          <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
          All jobs
        </Link>

        <h1 className="mt-2 text-2xl font-extrabold">{data.job.title}</h1>
        <p className="mt-1 text-sm text-mid">
          <span className="font-mono">{data.job.jobId}</span>
          {data.job.client ? ` · ${data.job.client}` : ""} ·{" "}
          <span className="tnum">{total}</span> application{total === 1 ? "" : "s"}
        </p>
      </header>

      {total === 0 ? (
        <div className="card mx-auto max-w-md p-6 text-center">
          <h2 className="font-extrabold">No applications yet</h2>
          <p className="mt-2 text-sm text-body">
            Share this job&apos;s application link and candidates will appear here automatically.
          </p>
        </div>
      ) : (
        <>
        <p className="mb-2 text-xs text-mid sm:hidden">Swipe sideways to move between stages.</p>
        <Board
          initialCards={data.cards}
          columnPageSize={data.columnPageSize}
        />
        </>
      )}
    </main>
  );
}
