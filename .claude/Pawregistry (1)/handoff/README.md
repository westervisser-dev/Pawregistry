# Pawregistry — Design Handoff (Client Portal)

> **Admin is already shipped.** This handoff is scoped to the **client portal** only.
> The full admin + portal source, screenshots, and tokens are still included for reference.

A complete redesign of the Pawregistry client portal, ready for Claude Code (or any dev) to implement against the existing codebase at `westervisser-dev/Pawregistry`.

Everything in this folder is self-contained:

```
handoff/
├── README.md                  ← you are here
├── DESIGN_TOKENS.md           ← colors, type, spacing, primitives
├── MIGRATION_PLAN.md          ← file-by-file port list, ordered
├── CLAUDE_CODE_PROMPTS.md     ← copy-paste prompts per PR
├── screenshots/               ← reference images (admin + portal + states)
└── source/                    ← the running HTML prototype
    ├── Pawregistry Admin.html
    ├── Pawregistry Portal.html
    ├── Pawregistry Portal States.html
    ├── data.js                (sample ZAR/SA data)
    ├── components/            (ui.jsx, shell.jsx, design-canvas.jsx)
    └── screens/               (dashboard, clients, portal, etc.)
```

## What was redesigned

| Surface | Status | File |
|---|---|---|
| Admin Dashboard | ✅ Done | `admin-01-dashboard.png` |
| Admin Clients list | ✅ Done | `admin-02-clients.png` |
| Admin Client detail (pipeline) | ✅ Done | `admin-03-client-detail.png` |
| Admin Litters | ✅ Done | `admin-04-litters.png` |
| Admin Litter detail | ✅ Done | `admin-05-litter-detail.png` |
| Admin Waitlist | ✅ Done | `admin-06-waitlist.png` |
| Admin Payments | ✅ Done | `admin-07-payments.png` |
| Portal Home (stage-adaptive) | ✅ Done | `portal-01-home-waitlisted.png` |
| Portal Litters | ✅ Done | `portal-02-litters.png` |
| Portal Updates (journal) | ✅ Done | `portal-03-updates.png` |
| Portal Payments | ✅ Done | `portal-04-payments.png` |
| Portal Documents | ✅ Done | `portal-05-documents.png` |
| Portal lifecycle states (all 7) | ✅ Design reference | `portal-states-all.png` |

## Direction at a glance

- **Warm editorial** — DM Serif Display headings over DM Sans body. Cream (`#f5f0e8`) canvas, brand amber (`#c47420`) accent, dark charcoal (`#2a2520`) for the admin sidebar.
- **Mobile-first portal** — bottom tab bar on phone, topbar at `md` breakpoint.
- **Desktop-first admin** — dense CRM layout (sidebar + topbar + main).
- **Stage-adaptive dashboards** — both admin and portal change hero content based on the client's lifecycle stage.

## How to use this handoff

1. Open `source/Pawregistry Admin.html` and `source/Pawregistry Portal.html` in a browser to play with the live prototype (they work offline).
2. Read `DESIGN_TOKENS.md` to match colors/type against your existing `client/src/index.css` tokens.
3. Follow `MIGRATION_PLAN.md` — it lists each target file in the real repo and what to port into it.
4. For each PR, copy the matching prompt from `CLAUDE_CODE_PROMPTS.md` into Claude Code in your repo.

## Important constraints for implementation

- **Do not port the sample data** in `data.js` — that's ZAR/SA demo data. Keep your existing Eden API calls and hook shapes.
- **Reuse existing tokens** in `client/src/index.css` (they already match). Do not introduce new CSS variables.
- **Drag-and-drop waitlist** — the visual is new; keep whatever DnD library you use (dnd-kit, react-dnd, etc).
- **Auth, routing, data fetching** are unchanged. Only presentation is in scope.
