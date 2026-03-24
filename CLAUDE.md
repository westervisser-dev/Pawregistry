# Paw Registry — Claude Guidelines

Expert full-stack developer. High-quality, production-ready code. Favour simplicity and native integrations over abstractions.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, Eden treaty |
| Backend | ElysiaJS, Bun, TypeScript |
| Database | Supabase Postgres via Drizzle ORM |
| Auth | Supabase Auth (magic link for clients, email/password for admin) |
| Storage | Supabase Storage |
| Deploy | Railway (frontend + backend), Supabase (DB + Storage) |
| Tooling | pnpm, Prettier, ESLint, Sentry (optional) |

**Monorepo (pnpm workspaces):**
```
paw-registry/
├── client/   # React SPA
├── server/   # ElysiaJS API
└── shared/   # Shared TypeScript types
```

---

## Development

```bash
pnpm install          # repo root
pnpm dev              # client :5173 + server :3000 concurrently
```

Server swagger: `http://localhost:3000/swagger`

```bash
# Run from server/
pnpm db:generate      # generate migration files
pnpm db:studio        # Drizzle Studio
```

No local DB container — connect directly to hosted Supabase instance.

---

## Coding Conventions

- **Indent:** Tabs (width 4)
- **Types:** Strict — never `any`. Use Elysia `t` schema for runtime + static inference.
- **Functions:** Small, pure where possible
- **State:** Local component state by default. Zustand only for true global state — keep stores small and focused.
- **Errors:** Fail gracefully. Capture via Sentry at outermost boundary.

---

## Key Patterns

### API client (Eden treaty)
All calls go through `client/src/lib/api.ts`, fully typed from server `App` export.

```ts
api.templates.admin.get()
api.templates.admin({ id }).patch({ ... })
api.templates.admin({ id }).delete()
```

### Auth middleware
- `authPlugin` — validates Supabase JWT (client routes)
- `adminPlugin` — checks `ADMIN_USER_IDS` env var (admin routes)

### Auth state (client)
- `client/src/stores/authStore.ts` — Zustand store, source of truth
- `client/src/lib/supabase.ts` — raw Supabase client, auth operations only
- `client/src/lib/auth.ts` — shared `ADMIN_EMAILS` constant (client-side hint only)
- **Never call Supabase directly for data — use Eden**

### Database
- Schema: `server/src/db/schema.ts`
- Migrations: `server/src/db/migrations/`
- Routes: `server/src/routes/<feature>/index.ts`, registered in `server/src/index.ts`
- Active route dirs: `auth`, `clients`, `documents`, `dogs`, `litters`, `messages`, `templates`, `updates`, `waitlist`
- Shared types: `shared/src/index.ts`

### Adding a page/route
1. Create `client/src/pages/<section>/MyPage.tsx`
2. Add `<Route>` in `client/src/main.tsx`
3. Add nav link to layout:
   - `/admin/*` → `AdminLayout.tsx`
   - `/portal/*` → `PortalLayout.tsx` (requires client auth)
   - Public → no layout wrapper

### Admin page structure
Pages are individual files — **not** a monolith `index.tsx`:
```
client/src/pages/admin/
├── _shared.tsx          # Shared: DeleteModal, AdminTable, ClientDndTable, etc.
├── index.tsx            # Re-exports only
├── AdminDashboard.tsx
├── AdminDogs.tsx / AdminDogDetail.tsx
├── AdminLitters.tsx / AdminLitterDetail.tsx
├── AdminClients.tsx / AdminClientDetail.tsx
├── AdminDocuments.tsx
└── AdminUpdates.tsx
```
Same pattern for `client/src/pages/portal/` (individual files + re-export `index.tsx`).

---

## Frontend

- **Tailwind v4:** `@import "tailwindcss";` in `index.css`, `@tailwindcss/vite` plugin in `vite.config.ts`. No `tailwind.config.js`.
- **Fonts:** `@fontsource` — sans-serif for UI, serif for headings.
- **Page titles:** Every page sets `document.title` in a `useEffect` with cleanup:
  ```ts
  useEffect(() => {
    document.title = 'Page Name — Paw Registry';
    return () => { document.title = 'Paw Registry'; };
  }, []);
  ```

### Accessibility conventions
- Skip nav link before `<header>`, `id="main-content"` on `<main>` — all layouts
- `role="status" aria-label="Loading…"` on `<Spinner>`
- `role="alert"` on inline error messages
- `role="dialog" aria-modal="true" aria-labelledby="modal-title"` on modals
- `aria-hidden="true"` on decorative emoji/icons

---

## Backend

- Heavy Elysia schema validation (TypeBox) on all requests + responses
- Always export `export type App = typeof app;` at end of `server/src/index.ts`
- **Storage:** file uploads via `@supabase/supabase-js`
- **Auth:** JWT validation server-side via Elysia plugin

---

## TypeScript Gotchas

- **`unknown &&` in JSX:** Use `!!value && <Component />` not `value && <Component />` when value is typed `unknown` (e.g. fields from `applicationData`).
- **`applicationData` cast:** `client.applicationData as unknown as Record<string, unknown>` — direct cast fails because `ClientApplication` doesn't overlap with `Record<string, unknown>`.
- **Eden tsc noise:** Standalone `tsc` (without server compiled) shows `'Please install Elysia before using Eden'` errors on all API types — these are expected non-errors. Build uses `vite build` (skips `tsc -b`).
- **`fetchPriority` prop:** Not supported in React 18 (`<img>`). Remove it or it throws a console warning.

---

## Important Rules

### 1. Always end features with commit + push commands

```bash
git add -A
git commit -m "feat: <description>"
git push origin <branch-name>
```

### 2. New tables — raw SQL only, no migration tooling

Never run `drizzle-kit migrate` or `pnpm db:migrate`. Provide raw SQL for the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS "my_table" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

Also update `server/src/db/schema.ts` and `shared/src/index.ts`.

---

## Storage Buckets

| Bucket | Purpose |
|---|---|
| `dog-images` | Dog profile photos |
| `litter-media` | Litter/puppy images |
| `update-media` | Journal post media |
| `client-documents` | Per-client uploaded documents |
| `health-certs` | Dog health certificates |
| `document-templates` | Admin-uploaded template files |

---

## Domain Model — Client Lifecycle

### Client Stages

| Stage | Value | Set By |
|---|---|---|
| Enquired | `enquired` | System — onboarding complete |
| Approved | `approved` | Admin |
| Rejected | `rejected` | Admin |
| Waitlisted | `waitlisted` | System — all docs checked off |
| Placed | `placed` | Admin — litter assigned |
| Match Requested | `match_requested` | Admin — awaiting puppy selection |
| Matched | `matched` | System — puppy selected |
| Matched & Paid | `matched_paid` | System/Admin |

### Deposit Status

| Label | DB Value |
|---|---|
| No Deposit | `none` |
| Deposit — Pending | `pending` |
| Deposit — Paid | `paid` |

### Admin Clients View — Three Tables

| Table | Filter | DnD |
|---|---|---|
| Waitlisted — Deposit | `stage = 'waitlisted'` AND `depositStatus != 'none'` | ✓ |
| Waitlisted — No Deposit | `stage = 'waitlisted'` AND `depositStatus = 'none'` | ✓ |
| Not Yet Waitlisted | `stage` in `['enquired','approved','rejected']` | ✗ |

Stages `placed`, `match_requested`, `matched`, `matched_paid` are managed in the litter/matching flow.

---

## Auth Model

- **Clients:** magic link sign-in. Email must pre-exist in `clients` table.
- **Admins:** identified by Supabase UUID in `ADMIN_USER_IDS` env var. Server always re-validates — `VITE_ADMIN_EMAILS` is a client-side UI hint only.

---

## Deployment (Railway + Supabase)

Deploy from **repo root** — Railway needs the full monorepo for `shared/`.

- Use `file:../shared` (not `workspace:*`) in package.json — workspace refs break on Railway
- Client build: `vite build` (not `tsc -b`)
- `DATABASE_URL`: Supabase Transaction pooler URL (port 6543)
- After deploy: add Railway client URL to Supabase → Auth → Redirect URLs
- Health check endpoint: `/health`
- Secrets via Railway env UI — never hardcode
- No Railway DB plugins — Supabase only
