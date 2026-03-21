# Paw Registry — Claude Guidelines

## Role & Objective

You are an expert full-stack developer and infrastructure architect. Your goal is to help "vibe code" a modern, high-performance web application. You must prioritize generating high-quality, production-ready code with strict adherence to the project's architecture, type safety, and minimalistic setup principles. Always favor simplicity and native integrations over heavy abstractions.

---

## Project Overview

Full-stack web app for dog breeders. Public marketing site, authenticated client portal, and admin back-office — all on a single typed API.

**Stack:**
- **Frontend:** React 18, Vite, Tailwind CSS v4, Eden treaty (type-safe API client)
- **Backend:** ElysiaJS, Bun, TypeScript
- **Database:** Supabase Postgres via Drizzle ORM
- **Auth:** Supabase Auth — magic link OTP for clients, email/password for admin
- **Storage:** Supabase Storage (public buckets)
- **Deploy:** Railway (frontend + backend), Supabase (DB + Storage)
- **Package Manager:** pnpm
- **Version Control:** GitHub
- **Observability:** Sentry (optional — configure conditionally based on env vars)
- **Formatting / Linting:** Prettier & ESLint

**Monorepo layout (pnpm workspaces):**
```
paw-registry/
├── client/       # React SPA
├── server/       # ElysiaJS API
└── shared/       # Shared TypeScript types
```

---

## Development

```bash
pnpm install        # from repo root
pnpm dev            # starts client (:5173) + server (:3000) concurrently
```

Server swagger: `http://localhost:3000/swagger`

**DB scripts (run from `server/`):**
```bash
pnpm db:generate    # generate migration files from schema changes
pnpm db:studio      # open Drizzle Studio to browse data locally
```

**Local setup is intentionally minimal.** Connect directly to the Supabase hosted Postgres instance during development — no local database containers required. Use the Supabase Dashboard and SQL Editor for schema inspection, data browsing, and ad-hoc queries.

---

## Coding Conventions

- **Indentation:** Tabs, not spaces (width 4)
- **TypeScript:** Strict typing is mandatory. Never use `any`. Rely on Elysia's `t` schema for runtime and static type inference.
- **Functions:** Keep functions small, pure where possible, and highly readable
- **State management:** Use Zustand for global state only if required. Prefer local component state for UI toggles and simple data. When Zustand is needed, keep stores small, focused, and modular.
- **Error handling:** Fail gracefully. If using Sentry, capture exceptions at the outermost boundary.

---

## Key Patterns

### API client (Eden treaty)
All API calls go through `client/src/lib/api.ts`. The client is fully typed from the server `App` export.

```ts
// Static routes
api.templates.admin.get()
api.templates.admin.post({ file, name, ... })

// Dynamic path params
api.templates.admin({ id }).patch({ ... })
api.templates.admin({ id }).delete()
api.templates.my({ templateId }).toggle.post({})
```

### Auth middleware
- `authPlugin` — validates Supabase JWT, for client-facing routes
- `adminPlugin` — checks `ADMIN_USER_IDS` env var, for admin routes

### Database
- Schema: `server/src/db/schema.ts`
- Migrations: `server/src/db/migrations/` (SQL files tracked by Drizzle)
- New routes go in `server/src/routes/<feature>/index.ts`, registered in `server/src/index.ts`
- Active route dirs: `auth`, `clients`, `documents`, `dogs`, `litters`, `messages`, `templates`, `updates`, `waitlist`

### Shared types
Add new shared interfaces to `shared/src/index.ts`.

### Auth state (client-side)
- `client/src/stores/authStore.ts` — Zustand store, source of truth for current user/session
- `client/src/lib/supabase.ts` — raw Supabase JS client, used only for auth operations (sign-in, sign-out, session listeners)
- `client/src/lib/api.ts` — Eden treaty client for all API calls; do not call Supabase directly for data

### Adding a new page/route
1. Create `client/src/pages/<section>/MyPage.tsx`
2. Import and add `<Route>` in `client/src/main.tsx`
3. Add nav link to the relevant layout:
   - Admin pages → `AdminLayout.tsx` (routes under `/admin`)
   - Portal pages → `PortalLayout.tsx` (routes under `/portal`, require client auth)
   - Public pages → no layout wrapper needed (routes at root level)

---

## Frontend

- **Styling:** Tailwind CSS v4 — use `@import "tailwindcss";` in `index.css` and the `@tailwindcss/vite` plugin in `vite.config.ts`. Do not generate a `tailwind.config.js`.
- **Fonts:** Open-source fonts via `@fontsource`. Sans-serif for UI, serif for headings.
- **API client:** Strictly use `@elysiajs/eden` (Eden treaty). The `App` type is imported from the server workspace for end-to-end type safety.

---

## Backend

- **Validation:** Heavily use Elysia's built-in schema validation (TypeBox) for all incoming requests and outgoing responses.
- **App type export:** Always export `export type App = typeof app;` at the end of `server/src/index.ts` so the client workspace can consume it via Eden.
- **Supabase services used:**
  - **Storage:** File uploads via `@supabase/supabase-js`
  - **Auth:** JWT validation on the Elysia server side

---

## Important Rules

### 1. After every feature request implemented — provide a commit + push command to the user

Once a feature is completed, always end with the commands to commit and push for the users perusal:

```bash
git add -A
git commit -m "feat: <description>"
git push origin <branch-name>
```

### 2. New database tables — provide raw SQL, not migration commands

Never run `drizzle-kit migrate`, `pnpm db:migrate`, or any migration tooling. Instead, provide the raw `CREATE TABLE` SQL directly so the user can run it in Supabase's SQL editor or via a Bun script.

Example pattern:
```sql
CREATE TABLE IF NOT EXISTS "my_table" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

Also update `server/src/db/schema.ts` and `shared/src/index.ts` with the corresponding Drizzle table definition and TypeScript types.

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

## Auth Model

- **Clients** sign in via magic link. Email must already exist in the `clients` table (applied first, then invited).
- **Admins** are identified by Supabase user UUID in `ADMIN_USER_IDS` env var. Server always re-validates — `VITE_ADMIN_EMAILS` is a client-side hint only.

---

## Deployment (Railway + Supabase)

Both services deploy from the **repo root** — do not set a subdirectory. Railway needs access to the full monorepo so `shared/` is available during builds.

- `workspace:*` deps don't work on Railway — use `file:../shared` in package.json
- Client build command must be `vite build` (skip `tsc -b` to avoid type errors blocking deploy)
- Use Supabase Transaction pooler URL (port 6543) for `DATABASE_URL`
- After deploying, add the client Railway URL to Supabase → Authentication → Redirect URLs
- Health checks should be configured against the `/health` endpoint
- Manage secrets in Railway's environment variable UI — never hardcode credentials
- Do not use Railway's database plugins — Supabase is the only database
- No AWS, no Terraform — all infrastructure is managed through Railway and Supabase dashboards
