# Migration Plan — Client Portal

Admin is already shipped. This plan covers the **client portal only**.

## Assumptions

- Tokens (PR 1) and typography (PR 2) are already live in `client/src/index.css` from the admin rollout.
- UI primitives (`Placeholder`, `Card`, `Button`, `Glyph`, `Avatar`, `StagePill`, `DepositPill`) already exist in `client/src/components/ui/` — reuse them, do not re-port.
- `AdminShell` is in place; the portal needs its own shell.

If any of the above isn't true, run the matching PR from the original handoff first.

---

## PR A — Portal shell

Port `PortalShell` from `source/components/shell.jsx` → `client/src/layouts/PortalShell.tsx`.

- Mobile-first: bottom tab bar at `<md` breakpoint, topbar at `md+`.
- Tabs: **Home, Litters, Updates, Payments, Documents**. Use `Glyph` for icons.
- Wire into the router so `/portal/*` routes use `PortalShell`.
- Existing auth/user menu moves into the topbar.

Acceptance: empty portal routes render inside the shell at both 375px and ≥1024px.

---

## PR B — Portal screens

One PR per screen, or batch them — your call. All sources live in
`source/screens/portal.jsx`.

| Screen | Prototype component | Target file | Reference screenshot |
|---|---|---|---|
| Home (stage-adaptive) | `PortalHome` | `client/src/pages/portal/Home.tsx` | `portal-01-home-waitlisted.png`, `portal-states-all.png` |
| Litters | `PortalLitters` | `client/src/pages/portal/Litters.tsx` | `portal-02-litters.png` |
| Updates | `PortalUpdates` | `client/src/pages/portal/Updates.tsx` | `portal-03-updates.png` |
| Payments | `PortalPayments` | `client/src/pages/portal/Payments.tsx` | `portal-04-payments.png` |
| Documents | `PortalDocuments` | `client/src/pages/portal/Documents.tsx` | `portal-05-documents.png` |

**`PortalHome` is the tricky one.** It renders a different hero card based on `client.stage`:

`enquired → approved → waitlisted → puppy_reserved → puppy_booked → puppy_fully_paid` (plus `rejected`)

All 7 hero variants are previewed side-by-side in `source/Pawregistry Portal States.html` — open that file to see exactly what each stage looks like. Keep the switch logic intact; wire `client.stage` to the real current-user/client hook.

For every screen:
- JSX structure verbatim from the prototype.
- Replace sample data (`sampleClient`, `sampleLitters`, etc. from `data.js`) with the real data-fetching hook already used in the app.
- Mobile-first: must look right at 375px. Same component tree on desktop — no separate routes.
- Tailwind classes unchanged.

---

## PR C — Polish

- Replace `Placeholder` components with real images once product provides photography. List screens still showing placeholders.
- Empty-states for every list view — `warm-400` muted tone, serif heading.
- Keyboard focus rings: `outline var(--brand-500)` offset 2px.
- Run axe-core against `/portal/*`; fix serious violations.

---

## What NOT to port

- `source/data.js` — ZAR/SA demo data. Real data comes from the existing API.
- `design-canvas.jsx` — only used by the states preview, not production.
- Any `alert()` / `console.log` stubs in the prototype.
