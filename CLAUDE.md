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

**Auth middleware:** `authPlugin` (JWT, client routes) | `adminPlugin` (`ADMIN_USER_IDS` env, admin routes)

**Auth state (client):**
- `client/src/stores/authStore.ts` — Zustand, source of truth
- `client/src/lib/supabase.ts` — raw client, auth ops only
- `client/src/lib/auth.ts` — `ADMIN_EMAILS` constant (UI hint only)
- **Never call Supabase directly for data — use Eden**

**Database:**
- Schema: `server/src/db/schema.ts` | Migrations: `server/src/db/migrations/`
- Routes: `server/src/routes/<feature>/index.ts`, registered in `server/src/index.ts`
- Active dirs: `auth`, `clients`, `documents`, `dogs`, `litters`, `messages`, `templates`, `updates`, `waitlist`
- Shared types: `shared/src/index.ts`

**Adding a page:** Create `client/src/pages/<section>/MyPage.tsx` → add `<Route>` in `main.tsx` → add nav link in `AdminLayout.tsx` or `PortalLayout.tsx`.

**Admin page structure** — individual files, not monolith:
```
client/src/pages/admin/
├── _shared.tsx      # DeleteModal, AdminTable, ClientDndTable, etc.
├── index.tsx        # Re-exports only
├── AdminDashboard.tsx
├── AdminDogs.tsx / AdminDogDetail.tsx
├── AdminLitters.tsx / AdminLitterDetail.tsx
├── AdminClients.tsx / AdminClientDetail.tsx
├── AdminDocuments.tsx / AdminUpdates.tsx
```
Same pattern for `portal/`.

## Frontend

- **Tailwind v4:** `@import "tailwindcss";` in `index.css`, `@tailwindcss/vite` in `vite.config.ts`. No `tailwind.config.js`.
- **Fonts:** `@fontsource` — sans-serif UI, serif headings.
- **Page titles:** Every page:
  ```ts
  useEffect(() => {
    document.title = 'Page Name — Paw Registry';
    return () => { document.title = 'Paw Registry'; };
  }, []);
  ```
- **A11y:** Skip nav + `id="main-content"` on all layouts. `role="status"` on Spinner, `role="alert"` on errors, `role="dialog" aria-modal="true" aria-labelledby="modal-title"` on modals, `aria-hidden="true"` on decorative icons.

## Backend

- Heavy Elysia/TypeBox schema validation on all requests + responses.
- Always export `export type App = typeof app;` at end of `server/src/index.ts`.
- File uploads via `@supabase/supabase-js`. JWT validation server-side via Elysia plugin.

## TypeScript Gotchas

- **`unknown &&` in JSX:** Use `!!value && <Component />` (not `value &&`) when typed `unknown`.
- **`applicationData` cast:** `client.applicationData as unknown as Record<string, unknown>` — direct cast fails.
- **Eden tsc noise:** `'Please install Elysia before using Eden'` errors are expected when running standalone `tsc`. Build uses `vite build`.
- **`fetchPriority`:** Not supported on `<img>` in React 18 — remove it.

## Important Rules

**1. Once any changes are made to the codebase provide a git commit command back to the user:**
```bash
git add -A && git commit -m "feat: <description>" && git push origin <branch>
```

**2. New tables — raw SQL only** (never `drizzle-kit migrate` / `pnpm db:migrate`):
```sql
CREATE TABLE IF NOT EXISTS "my_table" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```
Also update `server/src/db/schema.ts` and `shared/src/index.ts`.
Always let user run SQL scripts.
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
| Placed | `placed` | Admin (litter assigned) |
| Match Requested | `match_requested` | Admin (awaiting puppy selection) |
| Matched | `matched` | System (puppy selected) |
| Matched & Paid | `matched_paid` | System/Admin |

**Deposit Status:** `none` (No Deposit) | `pending` (Pending) | `paid` (Paid)

**Admin Clients — Three Tables:**

| Table | Filter | DnD |
|---|---|---|
| Waitlisted — Deposit | `stage='waitlisted'` AND `depositStatus!='none'` | ✓ |
| Waitlisted — No Deposit | `stage='waitlisted'` AND `depositStatus='none'` | ✓ |
| Not Yet Waitlisted | `stage` in `['enquired','approved','rejected']` | ✗ |

Stages `placed`, `match_requested`, `matched`, `matched_paid` managed in litter/matching flow.

## Auth Model

- **Clients:** magic link. Email must pre-exist in `clients` table.
- **Admins:** Supabase UUID in `ADMIN_USER_IDS` env. Server always re-validates — `VITE_ADMIN_EMAILS` is UI hint only.

## Deployment

Deploy from **repo root** (Railway needs full monorepo for `shared/`).

- `file:../shared` in package.json (not `workspace:*` — breaks on Railway)
- Client build: `vite build` (not `tsc -b`)
- `DATABASE_URL`: Supabase Transaction pooler (port 6543)
- After deploy: add Railway client URL to Supabase → Auth → Redirect URLs
- Health check: `/health` | Secrets via Railway env UI — never hardcode | No Railway DB plugins
