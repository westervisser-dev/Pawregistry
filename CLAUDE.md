# Paw Registry — Claude Guidelines

Expert full-stack developer. High-quality, production-ready code. Favour simplicity and native integrations over abstractions.

## Stack & Structure

**Frontend:** React 18, Vite, Tailwind CSS v4, Eden treaty | **Backend:** ElysiaJS, Bun, TypeScript | **DB:** Supabase Postgres + Drizzle ORM | **Auth:** Supabase Auth | **Deploy:** Railway + Supabase | **Tooling:** pnpm, Prettier, ESLint, Sentry (optional)

```
paw-registry/
├── client/   # React SPA (:5173)
├── server/   # ElysiaJS API (:3000)
└── shared/   # Shared TS types
```

```bash
pnpm install && pnpm dev   # root — starts both
# from server/:
pnpm db:generate           # generate migrations
pnpm db:studio             # Drizzle Studio
```

No local DB — connects directly to hosted Supabase. Swagger: `http://localhost:3000/swagger`

## Coding Conventions

- **Indent:** Tabs (width 4). **Types:** Strict, never `any`. Use Elysia `t` schema for runtime + static inference.
- **State:** Local by default; Zustand only for true global state (keep stores small).
- **Errors:** Fail gracefully, capture via Sentry at outermost boundary.

## Key Patterns

**API (Eden treaty)** — all calls via `client/src/lib/api.ts`, typed from server `App` export:
```ts
api.templates.admin.get()
api.templates.admin({ id }).patch({ ... })
```

**Auth middleware:** `authPlugin` (Supabase JWT, client routes) | `adminPlugin` (`ADMIN_USER_IDS` env or `admins` table, admin routes)

**Auth state (client):**
- `client/src/stores/authStore.ts` — Zustand, source of truth
- `client/src/lib/supabase.ts` — raw client, auth ops only
- `client/src/lib/auth.ts` — `ADMIN_EMAILS` constant (UI hint only)
- **Never call Supabase directly for data — use Eden**

**Database:**
- Schema: `server/src/db/schema.ts` | Migrations: `server/src/db/migrations/`
- Routes: `server/src/routes/<feature>/index.ts`, registered in `server/src/index.ts`
- Active dirs: `admins`, `auth`, `clients`, `email`, `invoices`, `litters`, `payments`, `templates`, `updates`
- Shared types: `shared/src/index.ts` | Breed/size config: `shared/src/breeds.ts` (edit per-breeder instance)

**Adding a page:** Create `client/src/pages/<section>/MyPage.tsx` → add `<Route>` in `main.tsx` → add nav link in `AdminLayout.tsx` or `PortalLayout.tsx`.

**Admin page structure** — individual files, not monolith:
```
client/src/pages/admin/
├── _shared.tsx      # DeleteModal, AdminTable, ClientDndTable, etc.
├── index.tsx        # Re-exports only
├── AdminDashboard.tsx
├── AdminLitters.tsx / AdminLitterDetail.tsx
├── AdminClients.tsx / AdminClientDetail.tsx
├── AdminPayments.tsx
├── AdminDocuments.tsx / AdminUpdates.tsx / AdminEmails.tsx / AdminAdmins.tsx
```
Same pattern for `portal/`.

## Frontend

- **Tailwind v4:** `@import "tailwindcss";` in `index.css`, `@tailwindcss/vite` in `vite.config.ts`. No `tailwind.config.js`.
- **Fonts:** `@fontsource` — sans-serif UI, serif headings.
- **Page titles:** Use `usePageTitle('Page Name')` hook (`client/src/hooks/usePageTitle.ts`). Reads `VITE_APP_NAME` via `client/src/config/app.ts`.
- **A11y:** Skip nav + `id="main-content"` on all layouts. `role="status"` on Spinner, `role="alert"` on errors, `role="dialog" aria-modal="true" aria-labelledby="modal-title"` on modals, `aria-hidden="true"` on decorative icons.

## Backend

- Heavy Elysia/TypeBox schema validation on all requests + responses.
- Always export `export type App = typeof app;` at end of `server/src/index.ts`.
- File uploads via `@supabase/supabase-js`. JWT validation server-side via Elysia plugin.

**Payments (Paystack):** `/payments` route — initiation + webhook handling. Types: `deposit` | `booking` | `final`. Statuses: `pending` | `complete` | `failed` | `cancelled`. Each payment auto-generates an invoice.

**Invoices:** Auto-generated, public view via `/invoice/:viewToken`. Statuses: `draft` | `sent` | `viewed` | `paid` | `cancelled`. Line items stored as JSONB.

**Email (Resend):** Trigger-based templates stored in `email_templates` table (unique `trigger` key). Logs in `email_logs`. Managed + previewed via `/email` route.

## TypeScript Gotchas

- **`unknown &&` in JSX:** Use `!!value && <Component />` (not `value &&`) when typed `unknown`.
- **`applicationData` cast:** `client.applicationData as unknown as Record<string, unknown>` — direct cast fails.
- **Eden tsc noise:** `'Please install Elysia before using Eden'` errors are expected when running standalone `tsc`. Build uses `vite build`.
- **`fetchPriority`:** Not supported on `<img>` in React 18 — remove it.
- **Drizzle named imports:** Neither `vite build` nor Bun runs tsc, so a missing named import (e.g. `desc`, `asc`, `inArray`) passes build and silently 500s at runtime. Always explicitly import every drizzle-orm function used: `eq`, `asc`, `desc`, `and`, `or`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `count`, `max`, `min`, `sql`, etc.
- **Drizzle date columns return `Date` objects:** `timestamp` / `date` columns come back as JS `Date` instances, not strings. Never render them directly in JSX — always format: `new Date(value).toLocaleDateString()` or `.toLocaleString()`. Applies to `createdAt`, `updatedAt`, `dateOfBirth`, `sentAt`, `checkedAt`, `paidAt`, `issuedAt`, `dueDate`, `viewedAt`, and any other date field.

## Important Rules

**1. Once any changes are made to the codebase provide a git commit command back to the user:**
```bash
git add -A && git commit -m "feat: <description>" && git push origin <branch>
```

**2. Any change to `schema.ts` — always do all three steps:**

- Update `server/src/db/schema.ts` (and `shared/src/index.ts` if shared types changed)
- Run `pnpm db:generate` from `server/` to produce a migration file in `server/src/db/migrations/`
- Provide the user with the contents of that generated `.sql` file to run manually on Supabase (dev first, then prod before pushing)

Never use `drizzle-kit migrate` / `pnpm db:migrate` — user always runs SQL manually.

Always provide both commands together at the end:
```bash
# 1. Run the generated SQL on dev Supabase first
# 2. Then commit and push to dev:
git add -A && git commit -m "feat: <description>" && git push origin dev
```

**3. Branching & deployment rules:**
- Default branch for all work is `dev` — always push to `dev` unless explicitly told otherwise
- Only push to `main` (production) when the user explicitly asks to go to prod
- When going to prod: run the same SQL on prod Supabase first, then:
```bash
git checkout main && git merge dev --no-edit && git push origin main && git checkout dev
```
- Always use `--no-edit` on merges to avoid being dropped into a Vim/editor prompt
---

## Storage Buckets

`dog-images` | `litter-media` | `update-media` | `client-documents` | `health-certs` | `document-templates`

## Domain Model — Client Lifecycle

**Client Stages:**

| Stage | Value | Set By |
|---|---|---|
| Enquired | `enquired` | System (onboarding complete) |
| Approved | `approved` | Admin |
| Rejected | `rejected` | Admin |
| Waitlisted | `waitlisted` | System (all docs checked off) |
| Puppy Reserved | `puppy_reserved` | System (R500/no-deposit client reserves a puppy) |
| Puppy Booked | `puppy_booked` | System (R5000 client reserves, or R500/no-deposit client pays booking) |
| Puppy Fully Paid | `puppy_fully_paid` | System (final payment received) |

**Deposit Tier:** `r5000` (Secured) | `r500` (Standard) | no deposit (Free)

**Deposit Status:** `none` | `pending` | `paid`

**Puppy Statuses:** `available` | `reserved` (24h booking window active) | `booked` | `puppy_fully_paid` | `retained` | `not_for_sale`

**Admin Clients — Four Tables:**

| Table | Filter | DnD |
|---|---|---|
| Waitlisted — Deposit | `stage` in `['waitlisted','puppy_reserved','puppy_booked']` AND `depositStatus` in `['pending','paid']` | ✓ |
| Waitlisted — No Deposit | `stage` in `['waitlisted','puppy_reserved','puppy_booked']` AND `depositStatus` in `['none', null]` | ✓ |
| Not Yet Waitlisted | `stage` in `['enquired','approved','rejected']` | ✗ |
| Completed | `stage='puppy_fully_paid'` | ✗ |

Active queue (`ACTIVE_QUEUE_STAGES`) = `['waitlisted', 'puppy_reserved', 'puppy_booked']` — clients stay in the DnD queue until `puppy_fully_paid`. Booking is fully automatic (no admin approval needed). Admins can only move a reserved/booked puppy back to available.

## Auth Model

- **Clients:** magic link. Email must pre-exist in `clients` table.
- **Admins:** Supabase UUID in `ADMIN_USER_IDS` env (fallback) or `admins` DB table. Server always re-validates — `VITE_ADMIN_EMAILS` is UI hint only.

## Deployment

Deploy from **repo root** (Railway needs full monorepo for `shared/`).

- `file:../shared` in package.json (not `workspace:*` — breaks on Railway)
- Client build: `vite build` (not `tsc -b`)
- `DATABASE_URL`: Supabase Transaction pooler (port 6543)
- After deploy: add Railway client URL to Supabase → Auth → Redirect URLs
- Health check: `/health` | Secrets via Railway env UI — never hardcode | No Railway DB plugins
- **Per-breeder instances:** `main` = boilerplate; create `breeder/<name>` branch per client. Each branch has its own Supabase project, Railway deployment, and env vars (`APP_NAME`, `VITE_APP_NAME`, `VITE_CONTACT_EMAIL`, `ADMIN_EMAIL`, `RESEND_FROM_EMAIL`). Breed config lives in `shared/src/breeds.ts` — edit per branch. Pull improvements from `main` via `git merge main`.

Always ask clarifying questions to the user if assumptions need to be made 
