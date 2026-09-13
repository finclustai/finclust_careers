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
import { useMemo, useState } from "react";
import { AlertCircle, GripVertical, Phone } from "lucide-react";
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
}

export function Board({
  initialCards,
  columnPageSize,
  jobTitle,
}: {
  initialCards: Card[];
  columnPageSize: number;
  jobTitle: string;
}) {
  const [cards, setCards] = useState(initialCards);
  const [dragging, setDragging] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    for (const card of cards) grouped.get(card.status)?.push(card);
    return grouped;
  }, [cards]);

  async function move(card: Card, to: ApplicationStatus) {
    const from = card.status;
    if (from === to) return;

    setError(null);
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
      {error && (
        <p role="alert" className="error mb-3">
          <AlertCircle size={15} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {error}
        </p>
      )}

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
              jobTitle={jobTitle}
              onMove={move}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging && <CardFace card={dragging} jobTitle={jobTitle} lifted />}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function Column({
  status,
  cards,
  pageSize,
  draggingFrom,
  jobTitle,
  onMove,
}: {
  status: ApplicationStatus;
  cards: Card[];
  pageSize: number;
  draggingFrom: ApplicationStatus | null;
  jobTitle: string;
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
          <DraggableCard key={card.id} card={card} jobTitle={jobTitle} onMove={onMove} />
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
  jobTitle,
  onMove,
}: {
  card: Card;
  jobTitle: string;
  onMove: (card: Card, to: ApplicationStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });

  return (
    <div ref={setNodeRef} className={isDragging ? "opacity-30" : ""}>
      <CardFace
        card={card}
        jobTitle={jobTitle}
        handleProps={{ ...attributes, ...listeners }}
        onMove={onMove}
      />
    </div>
  );
}

function CardFace({
  card,
  jobTitle,
  handleProps,
  onMove,
  lifted,
}: {
  card: Card;
  jobTitle: string;
  handleProps?: Record<string, unknown>;
  onMove?: (card: Card, to: ApplicationStatus) => void;
  lifted?: boolean;
}) {
  const router = useRouter();
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
