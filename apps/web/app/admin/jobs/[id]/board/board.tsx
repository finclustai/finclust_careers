"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckSquare, GripVertical, Mail, Phone, Search, Undo2, X } from "lucide-react";
import { ShareDialog } from "@/components/share-dialog";
import { WhatsAppButton } from "@/components/whatsapp-button";
import {
  APPLICATION_STATUSES,
  SOURCE_LABEL,
  STATUS_STYLE,
  canTransition,
  relativeTime,
  type ApplicationStatus,
} from "@/lib/status";

export interface Card {
  id: string;
  applicationReference: string;
  status: ApplicationStatus;
  source: string;
  appliedAt: string;
  candidate: {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    totalExperience: string | number | null;
  };
  assignedRecruiter: { id: string; name: string } | null;
  jobOpening: { id: string; jobId: string; title: string };
}

// Which cards are ticked for sharing. A context, so the columns and cards in
// between do not each pass it along.
const Selection = createContext<{ selected: Set<string>; toggle: (id: string) => void } | null>(null);

/**
 * One job's board, or with `combined` every job's on one board (ADR-0010). The
 * combined board labels each card with its job and can filter to one.
 */
export function Board({
  initialCards,
  columnPageSize,
  combined = false,
}: {
  initialCards: Card[];
  columnPageSize: number;
  combined?: boolean;
}) {
  const [cards, setCards] = useState(initialCards);
  const [dragging, setDragging] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [undo, setUndo] = useState<{ card: Card; from: ApplicationStatus; to: ApplicationStatus } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const selection = useMemo(
    () =>
      selecting
        ? {
            selected,
            toggle: (id: string) =>
              setSelected((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              }),
          }
        : null,
    [selecting, selected],
  );
  const selectedCards = cards.filter((c) => selected.has(c.id));
  const selectedJobs = new Set(selectedCards.map((c) => c.jobOpening.id)).size;

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  const jobs = useMemo(
    () => [...new Map(initialCards.map((c) => [c.jobOpening.id, c.jobOpening])).values()],
    [initialCards],
  );

  const sensors = useSensors(
    // A small distance threshold keeps a click on the card from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Ships keyboard dragging, so the board is operable without a mouse.
    useSensor(KeyboardSensor),
  );

  const columns = useMemo(() => {
    const grouped = new Map<ApplicationStatus, Card[]>(
      APPLICATION_STATUSES.map((status) => [status, []]),
    );
    const needle = search.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    for (const card of cards) {
      if (jobFilter && card.jobOpening.id !== jobFilter) continue;
      if (
        needle &&
        !card.candidate.name.toLowerCase().includes(needle) &&
        !card.applicationReference.toLowerCase().includes(needle) &&
        !(digits.length >= 3 && card.candidate.phone.includes(digits))
      ) {
        continue;
      }
      grouped.get(card.status)?.push(card);
    }
    return grouped;
  }, [cards, search, jobFilter]);

  const shown = [...columns.values()].reduce((sum, list) => sum + list.length, 0);

  // A mis-drop on a phone is easy; the way back is one tap for a few seconds.
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timer);
  }, [undo]);

  async function move(card: Card, to: ApplicationStatus, offerUndo = true) {
    const from = card.status;
    if (from === to) return;

    setError(null);
    setUndo(null);
    // Applied optimistically; rolled back visibly if the API refuses.
    setCards((all) => all.map((c) => (c.id === card.id ? { ...c, status: to } : c)));

    try {
      const response = await fetch(`/api/applications/${card.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "That move could not be saved.");
      }
      if (offerUndo) setUndo({ card: { ...card, status: to }, from, to });
    } catch (caught) {
      setCards((all) => all.map((c) => (c.id === card.id ? { ...c, status: from } : c)));
      setError(caught instanceof Error ? caught.message : "That move could not be saved.");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const card = cards.find((c) => c.id === event.active.id);
    const to = event.over?.id as ApplicationStatus | undefined;
    if (!card || !to) return;
    void move(card, to);
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging(cards.find((c) => c.id === event.active.id) ?? null);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Search this board</span>
          <Search size={16} strokeWidth={2.5} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mid" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, phone or reference"
            className="field !min-h-[44px] !pl-9"
          />
        </label>
        <button
          type="button"
          onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
          aria-pressed={selecting}
          className={`btn !min-h-[44px] ${selecting ? "btn-primary" : "btn-secondary"}`}
        >
          <CheckSquare size={16} strokeWidth={2.5} aria-hidden />
          {selecting ? "Cancel selecting" : "Select to share"}
        </button>
        {combined && jobs.length > 1 && (
          <label className="min-w-0 flex-1 basis-60 sm:max-w-xs">
            <span className="sr-only">Show one job</span>
            <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="field !min-h-[44px]">
              <option value="">All jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.jobId})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {(search || jobFilter) && (
        <p className="mb-2 text-xs text-mid" aria-live="polite">
          Showing <span className="tnum font-bold">{shown}</span> of <span className="tnum">{cards.length}</span>
        </p>
      )}

      {selecting && (
        <div className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md flex-wrap items-center gap-2 rounded-[14px] border-2 border-ink bg-paper p-2 pl-4 shadow-[0_4px_0_var(--color-ink)]">
          <span className="min-w-0 flex-1 text-sm">
            <strong className="tnum">{selected.size}</strong> selected
            {selectedJobs > 1 && <span className="block text-xs text-[#c11a12]">Pick CVs from one job</span>}
          </span>
          <button
            type="button"
            disabled={selected.size === 0 || selectedJobs > 1}
            onClick={() => setSharing(true)}
            className="btn btn-primary !min-h-[44px]"
          >
            <Mail size={16} strokeWidth={2.5} aria-hidden />
            Share CVs
          </button>
        </div>
      )}
      {sharing && (
        <ShareDialog
          applications={selectedCards.map((c) => ({ id: c.id, name: c.candidate.name }))}
          onClose={(shared) => {
            setSharing(false);
            if (shared) {
              // The draft moved some cards on; reload the board to show where.
              stopSelecting();
              window.location.reload();
            }
          }}
        />
      )}

      {undo && !selecting && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center gap-3 rounded-[14px] border-2 border-ink bg-ink p-2 pl-4 text-sm text-paper shadow-[0_4px_0_var(--color-orange)]"
        >
          <span className="min-w-0 flex-1 truncate">
            {undo.card.candidate.name} moved to <strong>{STATUS_STYLE[undo.to].label}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              const { card, from } = undo;
              setUndo(null);
              void move(card, from, false);
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border-2 border-paper bg-orange px-3 font-bold text-ink"
          >
            <Undo2 size={15} strokeWidth={2.5} aria-hidden />
            Undo
          </button>
          <button type="button" onClick={() => setUndo(null)} aria-label="Dismiss" className="icon-button text-paper">
            <X size={16} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="error mb-3">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}

      <Selection.Provider value={selection}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* `relative` is load-bearing. Tailwind's sr-only is position:absolute,
            and without a positioned ancestor those screen-reader labels resolve
            against the viewport -- anchoring at the document coordinates of a
            column scrolled far right and dragging the whole page wide, so the
            page slid sideways into blank space. Positioning the scroller keeps
            them inside its own scroll area. */}
        <div className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] sm:mx-0 sm:snap-none sm:px-0">
          {APPLICATION_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              cards={columns.get(status) ?? []}
              pageSize={columnPageSize}
              draggingFrom={dragging?.status ?? null}
              combined={combined}
              onMove={move}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging && <CardFace card={dragging} combined={combined} lifted />}
        </DragOverlay>
      </DndContext>
      </Selection.Provider>
      {/* Room to scroll the last cards out from under the selection bar. */}
      {selecting && <div className="h-20" aria-hidden />}
    </>
  );
}

function Column({
  status,
  cards,
  pageSize,
  draggingFrom,
  combined,
  onMove,
}: {
  status: ApplicationStatus;
  cards: Card[];
  pageSize: number;
  draggingFrom: ApplicationStatus | null;
  combined: boolean;
  onMove: (card: Card, to: ApplicationStatus) => void;
}) {
  const [shown, setShown] = useState(pageSize);
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = STATUS_STYLE[status];

  // Every column accepts every card now (ADR-0008); only the column a card came
  // from is inert, because a move to the same stage changes nothing.
  const inert = draggingFrom === status;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${style.label}, ${cards.length} applications`}
      className={[
        // Nearly the full screen on a phone so one stage is readable at a time,
        // fixed width once there is room for several side by side.
        "flex w-[86vw] max-w-[300px] shrink-0 snap-start flex-col rounded-[14px] border-2 border-ink p-2.5 transition-opacity duration-150 sm:w-[276px]",
        style.well,
        inert ? "opacity-60" : "opacity-100",
        isOver && !inert ? "ring-4 ring-orange-tint" : "",
      ].join(" ")}
    >
      <header className="mb-2.5 flex items-center justify-between px-1">
        <span className="flex items-center gap-2 text-sm font-extrabold">
          <span className={`size-2.5 rounded-full ${style.dot}`} aria-hidden />
          {style.label}
        </span>
        <span className="tnum text-sm font-bold text-mid">{cards.length}</span>
      </header>

      <div className="flex flex-col gap-2.5">
        {cards.slice(0, shown).map((card) => (
          <DraggableCard key={card.id} card={card} combined={combined} onMove={onMove} />
        ))}

        {cards.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-mid">
            Nothing here yet
          </p>
        )}

        {cards.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + pageSize)}
            className="min-h-[44px] rounded-[10px] border-2 border-dashed border-ink text-xs font-bold"
          >
            Show {Math.min(pageSize, cards.length - shown)} more
          </button>
        )}
      </div>
    </section>
  );
}

function DraggableCard({
  card,
  combined,
  onMove,
}: {
  card: Card;
  combined: boolean;
  onMove: (card: Card, to: ApplicationStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });

  return (
    <div ref={setNodeRef} className={isDragging ? "opacity-30" : ""}>
      <CardFace
        card={card}
        combined={combined}
        handleProps={{ ...attributes, ...listeners }}
        onMove={onMove}
      />
    </div>
  );
}

function CardFace({
  card,
  combined,
  handleProps,
  onMove,
  lifted,
}: {
  card: Card;
  combined: boolean;
  handleProps?: Record<string, unknown>;
  onMove?: (card: Card, to: ApplicationStatus) => void;
  lifted?: boolean;
}) {
  const router = useRouter();
  const selection = useContext(Selection);
  // Every stage but the current one (ADR-0008).
  const destinations = APPLICATION_STATUSES.filter((s) => canTransition(card.status, s));
  const experience = card.candidate.totalExperience;
  const href = `/admin/applications/${card.id}`;

  return (
    <article
      // Double-click opens the candidate. The drag sensor has a 6px threshold,
      // so a click never starts a drag and the two do not compete. The name is
      // also a plain link, because double-click does not exist on touch and is
      // not reachable from a keyboard.
      onDoubleClick={onMove ? () => router.push(href) : undefined}
      className={[
        "rounded-[14px] border-2 border-ink bg-paper p-2.5",
        lifted ? "rotate-2 shadow-[0_6px_0_var(--color-ink)]" : "shadow-[0_2px_0_var(--color-ink)]",
      ].join(" ")}
    >
      {selection && onMove && (
        <label className="-mx-1 -mt-1 mb-1 flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[8px] px-1 text-xs font-bold hover:bg-sand">
          <input
            type="checkbox"
            checked={selection.selected.has(card.id)}
            onChange={() => selection.toggle(card.id)}
            className="size-5 accent-[#ff8a1e]"
          />
          Select {card.candidate.name.split(" ")[0]}
        </label>
      )}
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          {...handleProps}
          aria-label={`Drag ${card.candidate.name}`}
          className="-ml-2 -mt-1.5 flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-[8px] text-mid active:cursor-grabbing"
        >
          <GripVertical size={15} strokeWidth={2} aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          {onMove ? (
            <Link
              href={href}
              onClick={(event) => event.stopPropagation()}
              className="flex min-h-[44px] items-center truncate text-sm font-bold leading-tight underline decoration-transparent underline-offset-2 hover:decoration-orange"
            >
              {card.candidate.name}
            </Link>
          ) : (
            <p className="truncate text-sm font-bold leading-tight">{card.candidate.name}</p>
          )}
          <p className="-mt-1.5 flex items-center gap-1 font-mono text-xs text-mid">
            <Phone size={11} strokeWidth={2} aria-hidden />
            {card.candidate.phone}
          </p>
        </div>

        <WhatsAppButton
          phone={card.candidate.phone}
          candidateName={card.candidate.name}
        />
      </div>

      {combined && (
        <p className="mt-2 truncate font-mono text-[11px] font-bold" title={card.jobOpening.title}>
          {card.jobOpening.jobId}
          <span className="font-sans font-normal text-mid"> · {card.jobOpening.title}</span>
        </p>
      )}

      <p className="mt-2 text-xs text-body">
        {[
          experience !== null && experience !== undefined ? `${experience} yrs` : null,
          card.candidate.location,
        ]
          .filter(Boolean)
          .join(" · ") || "No details given"}
      </p>

      <p className="mt-1 text-xs text-mid">
        {SOURCE_LABEL[card.source] ?? card.source} · {relativeTime(card.appliedAt)}
      </p>

      {onMove && (
        <label className="mt-2.5 block">
          <span className="sr-only">Move {card.candidate.name} to another stage</span>
          <select
            value=""
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const to = event.target.value as ApplicationStatus;
              if (to) onMove(card, to);
            }}
            className="min-h-[44px] w-full rounded-[10px] border-2 border-ink bg-sand px-2.5 text-xs font-bold"
          >
            <option value="">Move to…</option>
            {destinations.map((status) => (
              <option key={status} value={status}>
                {STATUS_STYLE[status].label}
              </option>
            ))}
          </select>
        </label>
      )}
    </article>
  );
}
