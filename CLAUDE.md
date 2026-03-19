# Paw Registry — Claude Guidelines

## Project Overview

Full-stack web app for dog breeders. Public marketing site, authenticated client portal, and admin back-office — all on a single typed API.

**Stack:**
- **Frontend:** React 18, Vite, Tailwind CSS v4, Eden treaty (type-safe API client)
- **Backend:** ElysiaJS, Bun, TypeScript
- **Database:** Supabase Postgres via Drizzle ORM
- **Auth:** Supabase Auth — magic link OTP for clients, email/password for admin
- **Storage:** Supabase Storage (public buckets)
- **Deploy:** Railway (frontend + backend), Supabase (DB + Storage)

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

### Shared types
Add new shared interfaces to `shared/src/index.ts`.

### Adding a new page/route
1. Create `client/src/pages/<section>/MyPage.tsx`
2. Import and add `<Route>` in `client/src/main.tsx`
3. Add nav link to the relevant layout (`AdminLayout.tsx` or `PortalLayout.tsx`)

---

## Important Rules

### 1. After every confirmed feature request — provide a commit + push command

Once a feature is complete and the user confirms, always end with the commands to commit and push:

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

## Deployment (Railway)

Both services deploy from the **repo root** — do not set a subdirectory. Railway needs access to the full monorepo so `shared/` is available during builds.

- `workspace:*` deps don't work on Railway — use `file:../shared` in package.json
- Client build command must be `vite build` (skip `tsc -b` to avoid type errors blocking deploy)
- Use Supabase Transaction pooler URL (port 6543) for `DATABASE_URL`
- After deploying, add the client Railway URL to Supabase → Authentication → Redirect URLs
