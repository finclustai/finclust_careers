import Link from "next/link";
import { apiGet, getSession } from "@/lib/server-api";
import { Board, type Card } from "../jobs/[id]/board/board";

export const dynamic = "force-dynamic";

interface BoardData {
  cards: Card[];
  counts: Record<string, number>;
  columnPageSize: number;
}

export default async function CombinedBoardPage() {
  const [data, user] = await Promise.all([apiGet<BoardData>("/applications/board"), getSession()]);
  const total = Object.values(data.counts).reduce((sum, n) => sum + n, 0);

  return (
    <main className="min-h-dvh overflow-x-clip px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold">All jobs board</h1>
        <p className="mt-1 text-sm text-mid">
          Every application across every job. <span className="tnum">{total}</span> in total
          {data.cards.length < total && <>, newest <span className="tnum">{data.cards.length}</span> shown</>}.
        </p>
      </header>

      {total === 0 ? (
        <div className="card mx-auto max-w-md p-6 text-center">
          <h2 className="font-extrabold">No applications yet</h2>
          <p className="mt-2 text-sm text-body">
            Start collecting on a job and share its link.{" "}
            <Link href="/admin/jobs" className="font-bold underline decoration-orange decoration-2 underline-offset-4">
              Go to jobs
            </Link>
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-mid sm:hidden">Swipe sideways to move between stages.</p>
          <Board initialCards={data.cards} columnPageSize={data.columnPageSize} combined me={{ id: user.id, role: user.role }} />
        </>
      )}
    </main>
  );
}
