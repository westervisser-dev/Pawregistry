# 🐾 Paw Registry

A full-stack web application for dog breeders. Includes a public-facing marketing site, an authenticated client portal, and an admin back-office — all sharing a single typed API.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite, Tailwind v4, Eden (type-safe API client) |
| Backend | ElysiaJS, Bun, TypeScript |
| Database | Supabase Postgres via Drizzle ORM |
| Auth | Supabase Auth (magic link) |
| Storage | Supabase Storage |
| Deploy | Railway (frontend + backend), Supabase (DB + Storage) |

---

## Project Structure

```
paw-registry/
├── client/               # React SPA
│   └── src/
│       ├── components/ui/  # Layouts, guards, shared UI
│       ├── pages/
│       │   ├── public/     # Home, Dogs, Litters, Apply, About
│       │   ├── portal/     # Client portal (authenticated)
│       │   └── admin/      # Admin back-office
│       ├── stores/         # Zustand (auth only)
│       └── lib/            # api.ts (Eden), supabase.ts
├── server/               # ElysiaJS API
│   └── src/
│       ├── db/             # Drizzle schema + migrations
│       ├── routes/         # dogs, litters, clients, updates, messages, documents, auth
│       └── lib/            # auth middleware, supabase client
└── shared/               # Shared TypeScript types
```

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-org/paw-registry.git
cd paw-registry
pnpm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Storage** → create these buckets (all public read):
   - `dog-images`
   - `litter-media`
   - `update-media`
   - `client-documents`
   - `health-certs`
3. Go to **Authentication** → **Email** → enable **Magic Links**
4. Set the redirect URL to `http://localhost:5173/portal/callback`

### 3. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Fill in DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USER_IDS

# Client
cp client/.env.example client/.env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_EMAILS
```

### 4. Run database migrations

```bash
cd server
pnpm db:generate
pnpm db:migrate
```

### 5. Start dev servers

```bash
# From root
pnpm dev
# → client: http://localhost:5173
# → server: http://localhost:3000
# → swagger: http://localhost:3000/swagger
```

---

## Features

### Public Site
- **Home** — hero, commitment section, current litters preview
- **Dogs** — gallery of all active breeding dogs, sex filter
- **Dog Profile** — full profile with health certs, pedigree tree (4 generations), photo gallery
- **Litters** — all public litters with puppy cards
- **Apply** — 4-step application form (personal → home → experience → preferences)
- **About**

### Client Portal (authenticated via magic link)
- **Dashboard** — application stage, matched puppy status
- **Updates** — week-by-week puppy journal with photos
- **Messages** — direct thread with the breeder
- **Documents** — download contracts, health records, go-home pack
- **Go-Home Checklist** — progress bar with all pre-pickup items

### Admin Portal
- **Dashboard** — counts overview, quick action links
- **Dogs** — full CRUD, health cert management, image uploads
- **Litters** — create litters, manage individual puppies (status, weight, images)
- **Clients** — full CRM with stage pipeline, application review, messaging
- **Waitlist** — prioritised list of waitlisted clients with ▲▼ reordering
- **Updates** — create and publish puppy journal posts to litters/clients

---

## Auth Model

- **Clients** sign in via magic link. Their `user_id` (Supabase auth UID) is linked to their `clients` record on first login.
- **Admins** are identified by their Supabase user UUID listed in `ADMIN_USER_IDS` env var (server) and by email in `VITE_ADMIN_EMAILS` (client-side hint only — server always re-validates).
- All authenticated routes validate the Supabase JWT via the `authPlugin` middleware.

---

## Deployment (Railway + Supabase)

### Backend
1. Create a Railway service pointing to this repo
2. Set build command: `pnpm --filter server build`  
   Start command: `bun run server/dist/index.js`
3. Add all server env vars in Railway's Variables tab
4. Enable health check at `/health`

### Frontend
1. Create a Railway static site service
2. Build command: `pnpm --filter client build`
3. Publish directory: `client/dist`
4. Add all `VITE_*` env vars

### Supabase
- Use the **Transaction pooler** connection string (port `6543`) for `DATABASE_URL`
- Do not use Railway's built-in database plugins

---

## Key Design Decisions

- **Self-referencing pedigree** — `dogs.sire_id` and `dogs.dam_id` point back to the same table. The pedigree endpoint walks this recursively up to 4 generations.
- **Update targeting** — an `Update` has `target_type` (litter/puppy/client) and `target_id`. The client portal fetches updates matching their litter ID, puppy ID, or client ID.
- **Priority-based waitlist** — clients have an integer `priority` field. Lower value = higher priority. The waitlist UI lets admin reorder with a single PATCH.
- **Magic-link only auth** — no passwords. Clients are only permitted to request a magic link if their email already exists in the `clients` table (applied first, then invited).
