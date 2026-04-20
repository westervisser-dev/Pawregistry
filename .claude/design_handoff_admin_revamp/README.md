# Handoff: Pawregistry Admin Back-Office Revamp

## Overview

Redesign of the `/admin/*` surface of Paw Registry — a warm, editorial revamp of the breeder-facing back-office. Focus areas: **Dashboard**, **Clients list**, **Client Detail** (the interactive stage journey tracker), **Litters**, **Waitlist**, **Payments**.

## About the Design Files

The files in this bundle are **design references created as a static HTML/React prototype**, not production code to copy directly. The prototype uses React 18 loaded from CDN via Babel — it is a visual + interaction reference only.

The task is to **recreate these designs inside the existing `client/` React SPA** (Vite + Tailwind v4 + Eden treaty + Zustand) using the codebase's existing patterns:

- Keep all Eden API calls and data-fetching logic in `AdminDashboard.tsx` / `AdminClients.tsx` / `AdminLitters.tsx` / `AdminClientDetail.tsx` / `AdminPayments.tsx` etc.
- Reuse design tokens already defined in `client/src/index.css` (`--color-brand-*`, `--color-warm-*`, `--color-stone-*`, `--radius-card`, `--shadow-card`). Do **not** introduce new CSS variables — the prototype colors map 1:1 to your tokens.
- Reuse shared primitives in `client/src/components/ui/index.tsx` and `client/src/pages/admin/_shared.tsx` (Card, CardHeader, PageHeader, StatCard, AdminTable, DeleteModal). Where the prototype introduces a new primitive (e.g. `StagePill`, `DepositPill`, `Segmented`, `StageTracker`), add it to `_shared.tsx` or `components/ui/index.tsx`.
- Follow existing conventions from `CLAUDE.md`: tabs (width 4), strict TypeScript, `usePageTitle`, a11y skip-nav + `role="dialog"` on modals, Drizzle date columns formatted via `.toLocaleDateString('en-ZA', ...)`.

## Fidelity

**High-fidelity.** Exact colors, typography, spacing, border radii, and interaction behaviors are specified below. Recreate pixel-faithfully using your existing Tailwind token scale — the prototype values were chosen to match your `@theme` block in `index.css`.

---

## Design Tokens (already in `client/src/index.css` — reuse, don't redefine)

### Colors
| Token | Hex | Use |
|---|---|---|
| `brand-500` | `#c47420` | Primary actions, active nav, progress bars, key accents |
| `brand-400` | `#d98e3a` | Gradient stops, hover |
| `brand-100` | `#f8e8d0` | Soft backgrounds (attention band bottom) |
| `brand-50`  | `#fdf6ee` | Softest wash (attention band top) |
| `warm-50`   | `#faf8f5` | Row hover |
| `warm-100`  | `#f5f0e8` | Page background |
| `warm-200`  | `#ede5d8` | Placeholder stripe dark, borders |
| `warm-400`  | `#b5a090` | Muted labels |
| `warm-500`  | `#9e8b78` | Helper copy |
| `warm-600`  | `#7a6a58` | Body |
| `warm-800`  | `#3d2510` | Headings (serif) |
| `warm-900`  | `#1e0e04` | Primary text |
| sidebar | `#2a2520` (prototype) / `#2e2e2e` (existing) | Sidebar bg |

### Stage pill palette (new — add to `_shared.tsx`)
Each stage gets a soft bg + dark fg + dot:

| Stage | bg | fg | dot |
|---|---|---|---|
| `enquired`          | `#fef3e7` | `#a35c17` | `#d98e3a` |
| `approved`          | `#e8efe5` | `#3f5a36` | `#4a6741` |
| `rejected`          | `#f4e4e1` | `#883224` | `#a8412e` |
| `waitlisted`        | `#e5ecf2` | `#1e5b8a` | `#2f78a9` |
| `puppy_reserved`    | `#f6e5e9` | `#8d2a4a` | `#b8446a` |
| `puppy_booked`      | `#e8dff0` | `#5a2d83` | `#7a47a8` |
| `puppy_fully_paid`  | `#e4ebe0` | `#3e5a2a` | `#5a7a3f` |

### Typography
- Sans: **DM Sans** (`@fontsource/dm-sans`) — body, UI, tables
- Serif: **DM Serif Display** (`@fontsource/dm-serif-display`) — all headings, stat card numbers, page titles

Scale used:
- Page title (h1): `font-serif`, `34px`, line-height `1.05`, color `warm-900`
- Card title (h3): `font-sans`, `15px`, weight `500`, color `warm-900`
- Body: `13px`, color `warm-800`
- Meta / helper: `11.5–12.5px`, color `warm-500`
- Uppercase eyebrow: `10.5–11px`, tracking `0.08–0.14em`, color `warm-400` / `warm-500`
- Stat card big number: `font-serif`, `38px`, line-height `1`

### Radii & Shadows
- Card: `14px` radius, shadow `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` — already defined as `--radius-card` / `--shadow-card`
- Button: `9px` radius (`--radius-button`)
- Pill / badge: fully rounded (`rounded-full`)
- Input: `8px` (`--radius-input`)

### Spacing conventions
- Page padding: `p-6 md:p-8`, max-width `1440px` (dashboard/clients/litters/payments), `1200px` (waitlist)
- Card padding: horizontal `22px`, vertical varies
- Table cell padding: `px-[18px] py-3` (dense) or `px-[22px] py-[13px]` (roomy — matches existing `AdminDashboard`)

---

## Screens

### 1. Dashboard — `AdminDashboard.tsx`

**Purpose:** At-a-glance overview; daily launch pad for the breeder.

**Layout (top to bottom):**
1. `PageHeader` with date breadcrumb, serif greeting (`Good afternoon, Sarah.`), one-line status subtitle, actions on the right (`This week`, `New litter`).
2. **Needs-attention band** (new) — horizontal gradient pill strip.
3. **Stats grid** — 4 `StatCard`s (existing component — extend to accept `accent: brand | green | blue | plum | rust`).
4. **Two-column grid** (2:1 on lg):
   - Left col: **Client pipeline** card + **Recent activity** card
   - Right col: Upcoming go-home, revenue sparkline, next selection day

**New components:**
- **`AttentionBand`** — amber gradient container (`#fdf6ee → #f8e8d0`, `1px solid #f0cfa0`, radius 14px, padding `20px`). Contains a row of "attention pills" — filterable buttons with colored dots, count + text, linking into filtered list views. Behavior from existing `AdminDashboard` already partially exists; visual treatment is the upgrade.
- **`Pipeline`** — 6-column grid of stages (`enquired, approved, waitlisted, puppy_reserved, puppy_booked, puppy_fully_paid`). Each column: stage dot + uppercase label, serif `28px` count, thin `1.5px` progress bar normalized to max count, small caption (`N moved on`).
- **`RevenueChart`** — inline SVG, 6-month line with `brand-500` stroke + gradient fill (`brand-500` @ 0.25 → 0). 100px tall. Use real data from `api.payments.admin` aggregated by month.
- **`UpcomingGoHome`** card — lists next 2 litters with `goHomeDate > today`, each a 64×64 photo thumb + name + breed/size/date.

---

### 2. Clients — `AdminClients.tsx`

**Purpose:** Searchable, filterable directory of everyone in the system.

**Layout:**
1. `PageHeader` with `Export CSV` + `Add client` actions.
2. **Filter bar** row: `Segmented` control (All / New / Approved / Waitlisted / Reserved / Completed, each with count) on the left; search input (`border border-warm-200`, h-9, search glyph) on the right.
3. **Table card** with columns: Client (avatar + name + email), Stage (`StagePill`), Deposit (`DepositPill`), City, Applied, Priority (mono `#NN` pill), Open →.
- Row hover: `bg-warm-50`, cursor-pointer, whole row navigates to detail.

**New components:**
- **`Segmented`** — pill tab group. `bg-warm-100 p-1 rounded-[10px] border border-warm-200`. Active pill: `bg-white shadow-sm text-warm-900`; inactive: `text-warm-600`. Count appended in `warm-400`.
- **`StagePill`** — `px-2.5 py-1 rounded-full text-[11px] font-medium`, 1.5px dot + label, bg/fg from stage palette above.
- **`DepositPill`** — three states (None / Pending R500 / Paid R5000), colors per deposit palette.
- **`Avatar`** — circular, initials, deterministic warm color from name hash. Sizes 26 / 28 / 34 / 64.

---

### 3. Client Detail — `AdminClientDetail.tsx` ⭐ hero screen

**Purpose:** Full CRM view; advance stage, review application, view payments, read activity.

**Layout:**
1. Back link (`← All clients`) small grey.
2. **Identity row:** 64px avatar + serif name (30px) + meta (email · city · Applied date) + pill row (Stage, Deposit, Waitlist priority).
   Right side: action buttons `Message`, `Edit`, `Advance stage` (primary).
3. **Journey tracker card** (the signature interaction — see below).
4. **Tab bar** (no card wrapper): Overview / Payments / Application / Documents / Activity. Active tab: `border-b-2 border-brand-500`.
5. Tab content.

**The Journey Tracker (`StageTracker` — new component):**
- 6 stages in a row: `Enquired → Approved → Waitlisted → Reserved → Booked → Fully paid`.
- A 2px horizontal rail behind the dots in `warm-200`; a progress fill in `brand-500` (`c47420`) sized `currentIndex / 5 * 100%`, animated 500ms.
- Each stage is a 28×28 circle: completed = filled `brand-500` with white check glyph; active = filled `brand-500` with tiny white center dot + 4px ring `rgba(196,116,32,0.18)`; upcoming = white with `warm-300` border.
- Below dot: `text-[12.5px] font-medium` label + `text-[10.5px] text-warm-400` caption (`Application received` / `Admin reviewed` / `Documents signed` / `Puppy chosen` / `Booking paid` / `Final balance`).
- Clicking a stage triggers the API `PATCH /clients/:id { stage }` — in the prototype this just updates local state for demo.
- Below the tracker, if `client.puppyId`: a 56×56 photo placeholder + puppy details + right-aligned price. This is the **matched-puppy strip**.

**Tabs:**
- **Overview:** 2:1 grid. Left: Payment progress card (gradient progress bar, 3 mini-stats), Preferences card (2-col grid of key/value). Right: Matched puppy card (photo + info + "Open in litter" link), Admin notes card (warm-50 box, italic text).
- **Payments:** Table — Type, Reference (mono), Amount (tabular-nums), Status (Paid/Pending pill), Date, Invoice →.
- **Application:** 3 cards side-by-side (Personal / Home / Experience), each a list of labeled fields.
- **Documents:** List of docs with colored status pills (Signed / Shared / Pending / Optional).
- **Activity:** Left-rail timeline, dot color per actor (`system: #7a6a58`, `admin: #c47420`, `client: #1e5b8a`), monospace timestamp right-aligned.

---

### 4. Litters — `AdminLitters.tsx` + `AdminLitterDetail.tsx`

**List view:**
- `PageHeader` + Segmented filter (Active / Planned / Available / Booked / Completed).
- 3-column card grid at xl, 2-col md.
- **Litter card:** cover photo (16:9 striped placeholder), body: stage pill + small breed/size caption, serif name (`22px`), `dam × sire` caption, then a **"N of M puppies placed"** block with right-aligned Go-home date and a `brand-500` progress bar. For `planned` litters, skip the progress block and show `Expected selection <date>` with a calendar glyph.

**Detail view:**
- 2:3 hero: big cover placeholder (aspect 16:10) + right-hand info stack (stage pill, serif name 36px, meta, 4-col key/value grid: Born / Go home / Selection / Deposit, then actions: `Publish update`, `Manage selection roster`, `Edit litter`).
- **Puppies grid** — 3-col at xl. Each puppy card: photo (4:3), collar color swatch + collar name, stage pill (or black "Retained" pill for retained pups), sex + colour + weight. If assigned to a client, a clickable mini-chip at the bottom: avatar + name + →.

**Collar colors** (swatches):
`Rust #b85a1f · Olive #6b7a3a · Sky #6ea8c9 · Plum #7a3a6b · Sand #d9c28b · Moss #4a6741`

---

### 5. Waitlist — new route `/admin/waitlist` (currently lives inside `AdminClients`)

**Purpose:** Drag-reorder priority queue.

**Layout:**
- `PageHeader`.
- `Segmented`: "With deposit" (count) / "No deposit" (count) — matches the two DnD tables in the existing `AdminClients` structure.
- **Row list card:** each row (py-3.5 px-4, border-b-warm): grip glyph · `#NN` mono priority · avatar · name/email/city · StagePill · DepositPill · "On list Nd" · `Open →`.
- Drag: opacity 40% on source, `bg-warm-50` + `inset 0 2px 0 brand-500` on drop target. Reorder via a single `PATCH /clients/waitlist/reorder` — use your existing DnD lib (the live app uses `ClientDndTable` from `_shared.tsx`), just restyle.

---

### 6. Payments — `AdminPayments.tsx`

**Layout:**
- `PageHeader` with `Export ledger` + `Create invoice`.
- **4-card stat grid:** Collected YTD / This month / Outstanding / Overdue (each with its own accent color).
- `Segmented`: All / Pending / Paid / Overdue.
- **Table:** Reference (mono) · Client (avatar + name) · Type (colored dot: deposit `#1e5b8a`, booking `#7a47a8`, final `#4a6741`) · Amount (tabular-nums) · Status pill · Date · Invoice →.

---

## Interactions & Behavior

- **Stage tracker click** — PATCH `/clients/:id` with new stage; optimistic UI; animated 500ms progress-rail fill.
- **Tab switching** — local state, no URL param change currently (consider adding `?tab=payments`).
- **Filter segments** — local state; for persistent filters use existing `?stage=` query-param pattern from the live app.
- **Waitlist DnD** — keep existing DnD library; restyle row + drag indicator only.
- **Row click → detail** — whole row is clickable on Clients and Payments tables.
- **Hover** — all list rows: `bg-warm-50`, 150ms transition. Cards in grids: `box-shadow: 0 6px 20px rgba(0,0,0,0.06)` on hover.
- **Focus** — keep existing `focus:ring-2 focus:ring-brand-400` pattern from `AdminLayout`.

## State Management

No new global state. All page-level state stays local per the existing convention (`CLAUDE.md` rule: Zustand only for auth). API data comes from existing Eden endpoints.

## Accessibility

Preserve existing `id="main-content"`, skip-nav, `role="status"` on spinners, `role="dialog" aria-modal="true"` on modals. Stage tracker buttons should have `aria-label="Advance to <stage>"` and `aria-current="step"` on the active stage. Decorative glyphs: `aria-hidden="true"`.

## Files in this bundle

- `Pawregistry Admin.html` — the root prototype; open in a browser to see everything
- `prototype/data.js` — sample ZAR data / clients / litters / puppies
- `prototype/components/ui.jsx` — StagePill, DepositPill, Card, StatCard, Button, Segmented, Avatar, Glyph, Placeholder
- `prototype/components/shell.jsx` — Sidebar + TopBar
- `prototype/screens/dashboard.jsx` — Dashboard + Pipeline + RevenueChart
- `prototype/screens/clients.jsx` — Clients list + ClientDetail + StageTracker + all tabs
- `prototype/screens/other.jsx` — Litters, LitterDetail, Waitlist, Payments

## Suggested migration order (smallest PRs first)

1. Add stage/deposit palette + `StagePill` / `DepositPill` / `Segmented` / `Avatar` primitives to `_shared.tsx`.
2. Port `AdminDashboard.tsx` — attention band + `Pipeline` component + `RevenueChart`.
3. Port `AdminClients.tsx` table styling + filter row.
4. Port `AdminClientDetail.tsx` — identity row + `StageTracker` + tab bar (the hero PR).
5. Port `AdminLitters.tsx` + `AdminLitterDetail.tsx` — card grid + puppy roster.
6. Port `AdminPayments.tsx` — stat cards + typed ledger.
7. Restyle waitlist rows inside `ClientDndTable`.

## Icons

The prototype uses small inline SVG glyphs (paw, people, coin, inbox, doc, home, calendar, grip, search, plus, check, bell). Replace with whatever icon library the codebase uses (none yet — the existing `AdminLayout` uses emoji). A thin lucide-react import would fit better than emoji; keep stroke width 1.6px to match.

## Images

All dog/puppy imagery is striped placeholders labeled in mono. Real photos come from Supabase buckets (`dog-images`, `litter-media`, `update-media`) as already wired. No new asset work required.
