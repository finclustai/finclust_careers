# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/finclust/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. If not, follow the rules below.

**Project:** FINCLUST Recruitment CV Management
**Direction:** Warm paper neo-brutalism — white canvas, ink borders, hard shadows,
vivid colour used as signal. Inspired by picnicpost.com.
**Primary surface:** Pipeline board (see ADR-0006), scoped to one Job Opening

The governing metaphor: a **paper card on a desk**. Cards are white with a solid
ink border and a hard, blur-free drop shadow, so dragging an Application between
stages feels like moving a physical CV. This is why the aesthetic fits the domain
rather than merely decorating it.

**What we take from the reference:** ink borders, hard offset shadows, warm paper
neutrals, chunky display type, and three colours drawn from its palette.
The reference runs nine; a recruitment console is not a consumer brand site and
earns far fewer.
**What we deliberately leave:** torn-paper SVG filters, rubber-stamp motifs and
vintage serif. Those suit a consumer newspaper brand; clients review candidate CVs
in this console and it must stay credible. The one exception is the candidate
success screen — see §6.

---

## 1. Colour

White is the canvas. Colour appears in exactly three places: a brand action, a won
outcome, a lost one. Everything else — every stage, every panel, every border — is
ink, paper or sand.

### Neutrals — warm, never grey

| Token | Hex | Usage |
|-------|-----|-------|
| `--paper` | `#FFFFFF` | Page background, cards |
| `--shell` | `#FFFDF8` | Raised panels |
| `--sand` | `#F9F6EE` | Board column wells, inert zones |
| `--ink` | `#15140F` | Primary text, all borders |
| `--body` | `#4A463D` | Supporting text |
| `--mid` | `#6B665C` | Labels, metadata |
| `--placeholder` | `#9B958A` | Placeholders, timestamps |
| `--line` | `#E7E1D3` | Hairlines, table row dividers |

Neutrals carry a warm olive cast. Never substitute a cold grey (`#71717A`,
`#E4E4E7`) — next to the warm tints it reads as dirt.

### Brand

**The system has exactly three colours.** Everything else is ink, paper or sand.

| Token | Hex | Tint | Means |
|-------|-----|------|-------|
| `--orange` | `#FF8A1E` | `#FFC68A` | Brand. Primary actions, active nav |
| `--green` | `#2FBF71` | `#D9F8E7` | Won. Selected, Offer, Joined |
| `--red` | `#FF3B30` | `#FFB3AE` | Lost or destructive. Rejected, delete |

A fourth colour is not an enhancement, it is a regression. Colour is scarce here
so that it carries weight: on a board of white cards, one green card reads as
"this one is won" from across the room. Nine colours said nothing.

**All three are fills, never text.** `#FF8A1E` on white is 2.35:1 and `#FF3B30`
is 3.6:1 against white — both fail. Ink on orange is 7.9:1, ink on green 7.8:1,
ink on red 5.2:1. So every coloured surface carries an **ink** label, never white.
For a coloured text link, use ink with an orange underline.

Because red and green are the only two semantic colours, they must never be the
sole difference between two states: every chip carries its text label, and
Selected/Rejected additionally carry a check and a cross icon. Deuteranopic users
read the label and the icon, not the hue.

### Pipeline stages

Six of the nine stages use **no colour at all**. On the board the column already
states the stage, so colour there would be redundant; in the cross-job table the
progression is carried by ink density instead, darkening as an Application
advances, then turning green when it is won.

| Application Status | Chip background | Border | Text |
|--------------------|-----------------|--------|------|
| New | `--paper` | 1px ink | ink |
| Screening | `--sand` | 1px ink | ink |
| Shortlisted | `--line` | 1px ink | ink |
| Interview | `--ink` | 1px ink | `--paper` (inverted) |
| Selected | green tint | 1px ink | ink, with check icon |
| Offer | green tint + solid green dot | 1px ink | ink |
| Joined | solid `--green` | 1px ink | ink |
| Rejected | red tint | 1px ink | ink, with cross icon |
| On Hold | `--paper` | 1px ink **dashed** | ink at 60% |

On Hold is the only dashed border in the system. Paused work looks provisional,
which is exactly what it is, and it costs no colour.

---

## 2. Typography

| Role | Font | Weights |
|------|------|---------|
| Display and UI | **Hanken Grotesk** | 400, 500, 600, 800, 900 |
| Identifiers | **JetBrains Mono** | 400, 500 |

Hanken Grotesk matches the reference exactly and is on Google Fonts, so it loads
through `next/font` with no third-party CDN. Headings use 800/900 to get the
chunky display weight without a second family — the reference's Tanker is a
Fontshare font and not worth a separate load for the same effect.

Monospace is used **only** for Job IDs, Application References and phone numbers,
where character-by-character scanning and copying is the actual task.

Scale: `12 / 13 / 14 / 16 / 20 / 24 / 32 / 40`. Body 14px in the admin console,
**16px minimum on the candidate form** (below 16px iOS auto-zooms on focus).
Line-height 1.5 for body, 1.2 for headings. Tabular figures on all numeric columns.

---

## 3. Spacing, radius, elevation

4px base scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`.

| Radius | Value | Applies to |
|--------|-------|------------|
| `--r-chip` | `9999px` | Status chips, filter pills |
| `--r-input` | `10px` | Inputs, buttons |
| `--r-card` | `14px` | Candidate cards, panels |
| `--r-modal` | `20px` | Modals, sheets |

Shadows are **hard offsets in ink with zero blur** — the paper-card look. A blurred
shadow anywhere in this system is a bug.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 2px 0 var(--ink)` | Resting cards, inputs |
| `--shadow-md` | `0 3px 0 var(--ink)` | Buttons, board cards |
| `--shadow-lg` | `0 6px 0 var(--ink)` | Dragged card, modals |

Borders are ink, not grey: **1px** for chips and table hairlines, **2px** for cards,
inputs and buttons, **3px** reserved for the dragged card and modals. Press states
translate the element down by its shadow offset and shrink the shadow to match, so
the element appears to physically depress — this is the one permitted transform,
and it must not shift neighbouring layout.

---

## 4. Motion

150-250ms, `ease-out` entering and `ease-in` exiting, exits at roughly 70% of enter
duration. Transform and opacity only — never width, height, top or left.

Drag uses spring physics, not a linear tween. Every animation is wrapped in
`prefers-reduced-motion: reduce`, under which drag still works but without the
spring.

---

## 5. Component specs

Primary button — orange fill, **ink** label at 7.9:1:

- background `--orange`, text `--ink`, border 2px `--ink`, shadow `--shadow-md`
- padding `10px 18px`, radius `--r-input`, weight 700, size 14px
- `:active` translates `translateY(3px)` and drops the shadow to `0 0 0` — it depresses
- `:focus-visible` gives a 2px ink outline at 3px offset (never a colour ring; orange
  on white cannot carry a focus indicator on its own)
- `:disabled` drops to 45% opacity with `cursor: not-allowed`

Secondary button is identical with a `--paper` fill instead of orange.

Card — white on the sand well, ink-bordered:

- background `--paper`, border 2px `--ink`, radius `--r-card`, shadow `--shadow-sm`
- hover lifts the shadow to `--shadow-md`; it does not move
- transitions box-shadow over 180ms, never transform on hover
- `cursor: pointer` belongs on cards that are genuinely clickable, not on all cards

Input — 16px font prevents iOS zoom-on-focus:

- padding `10px 14px`, border 2px `--ink`, radius `--r-input`, background `--paper`
- `:focus-visible` keeps the ink border and adds a 3px `--orange-tint` ring outside it
- `[aria-invalid="true"]` sets the border to `#FF3B30` and adds the error below

---

## 6. Board specifics

- The board renders **one Job Opening at a time**. There is no all-jobs board.
- Columns are plain `--sand` wells — they are **not** tinted per stage. The column
  header names the stage; tinting nine wells would reintroduce the nine colours we
  just removed. Cards are white with 2px ink borders.
- The exceptions are the Selected/Offer/Joined and Rejected wells, which carry their
  green and red tint at low opacity. Only the outcome columns earn colour.
- A column shows its count in the header and paginates at 50 cards with a
  "Show more" control.
- A card being dragged goes to 3px border and `--shadow-lg`, tilting ~2 degrees. It is
  the only rotation in the system and it exists to sell the paper metaphor.
- The candidate success screen is the one place the reference's playfulness is allowed
  in full: the Application Reference is presented as a stamped ticket. Recruiters never
  see it, clients never see it, and it is the single delight moment in the product.
- Dragging is **never the only way** to change status: every card carries a status
  control in its overflow menu, and columns are keyboard-reachable. `@dnd-kit` is
  used because it ships keyboard dragging and screen-reader announcements by default.
- During a drag, columns representing an **illegal transition dim to 40% and refuse
  the drop**, driven by the same `canTransition` function the API validates with.
- Drops apply optimistically and roll back visibly on failure.

---

## 7. Anti-patterns

- **A fourth colour.** Three exist: orange, green, red. Anything else is ink, paper
  or sand. Yellow, blue, purple and cyan are gone and are not coming back
- Emoji as icons — use Lucide, one icon set, 2px stroke to match the ink borders, 20px default
- **Coloured text on white** — orange is 2.35:1 and red 3.6:1, both fail. All three
  colours are fills carrying ink labels
- **Blurred shadows** — every shadow in this system is a hard ink offset
- **Cold greys** (`#71717A`, `#E4E4E7`, `#F4F4F5`) — neutrals are warm, see §1
- Red and green as the only difference between two states — always pair with the
  text label and the check/cross icon
- Colour as the only signal — every status chip carries its label
- `cursor: pointer` on non-interactive elements
- Layout-shifting hover — hover changes shadow only; press translates without
  moving neighbours
- Placeholder used as the only label
- Body text under 4.5:1 contrast, or under 16px on the candidate form
- Invisible focus states — ink `:focus-visible` outline on everything interactive
- Drag as the only path to an outcome
- Orange used for anything other than brand actions

---

## 8. Pre-delivery checklist

- [ ] No emoji icons; single icon set throughout
- [ ] `cursor-pointer` only on genuinely clickable elements
- [ ] Transitions 150-250ms; `prefers-reduced-motion` honoured
- [ ] Text contrast 4.5:1 or better, verified on tinted chip backgrounds too
- [ ] `:focus-visible` ring on every interactive element
- [ ] Full keyboard path for drag-and-drop
- [ ] Candidate form usable at 375px with no horizontal scroll
- [ ] Form inputs 16px font and 44px minimum touch height
- [ ] Errors use `role="alert"`, sit below their field, and state the fix
- [ ] Empty states explain what to do next, never blank space
- [ ] Tabular figures on numeric columns
