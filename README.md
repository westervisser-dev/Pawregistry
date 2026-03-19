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

Both services deploy from the **root of the repo** (`/`). Do not set a subdirectory as the root — Railway needs access to the full monorepo so `shared/` is available during builds.

### Server service

1. In Railway, create a new project → Deploy from GitHub repo → select your repo
2. Railway will auto-detect two services. Open the **server service → Settings**:
   - **Root Directory:** leave empty (repo root)
   - **Build command:** `npm install -g pnpm && pnpm install --no-frozen-lockfile`
   - **Start command:** `cd server && bun run src/index.ts`
3. **Settings → Networking** → Generate Domain
4. **Variables** — add all of the following:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_USER_IDS=your-supabase-user-uuid
CLIENT_URL=https://your-client-railway-url.up.railway.app
PORT=3000
NODE_ENV=production
```

> Use the **Transaction pooler** URL from Supabase (port 6543): Project Settings → Database → Connection string → Transaction mode.
> URL-encode special characters in passwords (e.g. `!` becomes `%21`).

### Client service

1. Open the **client service → Settings**:
   - **Root Directory:** leave empty (repo root)
   - **Build command:** `npm install -g pnpm && cd client && pnpm install --no-frozen-lockfile && pnpm build`
   - **Start command:** leave empty (static site)
2. **Settings → Networking** → Generate Domain
3. **Variables** — add:

```
VITE_API_URL=https://your-server-railway-url.up.railway.app
VITE_SUPABASE_URL=https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_EMAILS=your@email.com
RAILPACK_SPA_OUTPUT_DIR=client/dist
```

4. Once deployed, copy the client Railway URL and update `CLIENT_URL` in the server variables.

### After deploying

- Go to Supabase → **Authentication → URL Configuration** and add your client Railway URL to **Redirect URLs** (required for magic link auth)
- Update the `emailRedirectTo` in `server/src/routes/auth/index.ts` to your production client URL

### Important notes from setup

- workspace:* dependencies do not work on Railway — both client and server package.json files reference the shared package as `file:../shared`
- The client build script must be `"build": "vite build"` (not `tsc -b && vite build`) to skip type checking during deployment
- Railway auto-detects pnpm once root directory is set to the repo root
- Do not use Railway built-in database plugins — use Supabase only


---

## Key Design Decisions

- **Self-referencing pedigree** — `dogs.sire_id` and `dogs.dam_id` point back to the same table. The pedigree endpoint walks this recursively up to 4 generations.
- **Update targeting** — an `Update` has `target_type` (litter/puppy/client) and `target_id`. The client portal fetches updates matching their litter ID, puppy ID, or client ID.
- **Priority-based waitlist** — clients have an integer `priority` field. Lower value = higher priority. The waitlist UI lets admin reorder with a single PATCH.
- **Magic-link only auth** — no passwords. Clients are only permitted to request a magic link if their email already exists in the `clients` table (applied first, then invited).
