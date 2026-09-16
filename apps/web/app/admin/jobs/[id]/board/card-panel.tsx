"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, FileText, Loader2, NotebookPen, X } from "lucide-react";
import { Notes } from "@/app/admin/applications/[id]/actions";
import { ResumePreview } from "@/app/admin/applications/[id]/resume-preview";
import { errorText, send } from "@/lib/client-api";
import type { Card } from "./board";

export type PanelTab = "notes" | "cv";

interface Detail {
  candidateNote: string | null;
  candidate: { notes: { id: string; body: string; createdAt: string; author: { name: string } }[] };
}

/**
 * A candidate's notes or CV without leaving the board. Slides in from the right;
 * full screen on a phone. The notes and preview are the same components the
 * application page uses.
 */
export function CardPanel({
  card,
  tab,
  onTab,
  onClose,
  onNoteAdded,
}: {
  card: Card;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  onNoteAdded: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const noteCount = card.candidate._count.notes;

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    setDetail(null);
    setError(null);
    send<Detail>("GET", `/applications/${card.id}`).then(setDetail, (caught) => setError(errorText(caught)));
  }, [card.id]);

  const tabClass = (active: boolean) =>
    `inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border-2 px-3 text-[13px] font-bold ${
      active ? "border-ink bg-orange-tint" : "border-transparent text-mid hover:border-ink"
    }`;

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the dimmed backdrop lands on the dialog element itself.
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-labelledby="panel-title"
      className={`m-0 ml-auto h-dvh max-h-none w-full max-w-full border-0 border-ink bg-paper p-0 text-ink backdrop:bg-ink/40 sm:border-l-2 ${
        tab === "cv" ? "sm:max-w-3xl" : "sm:max-w-md"
      }`}
    >
      <div className="flex h-full flex-col">
        <header className="border-b-2 border-ink px-4 pb-2 pt-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 id="panel-title" className="truncate text-base font-extrabold">
                {card.candidate.name}
              </h2>
              <p className="truncate text-xs text-mid">
                {card.jobOpening.title} · <span className="font-mono">{card.applicationReference}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="icon-button shrink-0 border-2 border-ink bg-paper">
              <X size={16} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "notes"} onClick={() => onTab("notes")} className={tabClass(tab === "notes")}>
              <NotebookPen size={15} strokeWidth={2.5} aria-hidden />
              Notes{noteCount ? ` (${noteCount})` : ""}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "cv"}
              disabled={!card.resume}
              onClick={() => onTab("cv")}
              className={`${tabClass(tab === "cv")} disabled:opacity-40`}
            >
              <FileText size={15} strokeWidth={2.5} aria-hidden />
              CV
            </button>
            <Link href={`/admin/applications/${card.id}`} className="text-link ml-auto text-mid">
              Full page <ExternalLink size={13} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </header>

        {tab === "cv" && card.resume ? (
          <div className="min-h-0 flex-1">
            <ResumePreview applicationId={card.id} fileName={card.resume.originalFileName} fileSize={card.resume.fileSize} fill />
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-shell p-4">
            {error && (
              <p role="alert" className="error">
                <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
                {error}
              </p>
            )}
            {!detail && !error && (
              <p className="flex items-center gap-2 text-sm text-mid">
                <Loader2 size={16} strokeWidth={2.5} aria-hidden className="animate-spin" />
                Loading notes…
              </p>
            )}
            {detail?.candidateNote && (
              <section className="card p-4">
                <h3 className="text-sm font-extrabold">Note from the candidate</h3>
                <blockquote className="mt-2 whitespace-pre-line break-words border-l-4 border-orange pl-3 text-sm text-body">
                  {detail.candidateNote}
                </blockquote>
              </section>
            )}
            {detail && <Notes applicationId={card.id} initial={detail.candidate.notes} onAdded={onNoteAdded} />}
          </div>
        )}
      </div>
    </dialog>
  );
}
