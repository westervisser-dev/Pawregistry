# Claude Code Prompts — Client Portal

Admin is already shipped. These prompts cover the portal only.

> **Attach to every session:** `handoff/DESIGN_TOKENS.md`, `handoff/MIGRATION_PLAN.md`, and the specific `handoff/source/…` file the PR is porting from. Screenshots in `handoff/screenshots/`.

---

## PR A — Portal shell

```
Read handoff/source/components/shell.jsx (PortalShell component only — AdminShell
is already shipped). Reference screenshot: handoff/screenshots/portal-01-home-waitlisted.png.

Task: build client/src/layouts/PortalShell.tsx.

1. Mobile-first: bottom tab bar at <md breakpoint, topbar at md+.
2. Tabs: Home, Litters, Updates, Payments, Documents. Use the existing Glyph
   primitive for icons (already in client/src/components/ui/).
3. Drive active tab from the current route via the router.
4. Wire into the router so /portal/* routes wrap in PortalShell. Existing
   auth/user menu moves into the topbar — don't rebuild it.

Do not migrate portal screens yet. The shell should wrap the current
placeholder content of each /portal route.

Verify at 375px (mobile — bottom tabs visible, no topbar) and ≥1024px
(desktop — topbar visible, no bottom tabs).
```

---

## PR B1 — Portal Home (stage-adaptive)

```
Read handoff/source/screens/portal.jsx — PortalHome component.
Open handoff/source/Pawregistry Portal States.html in a browser to see all 7
hero variants side-by-side. Reference screenshots: portal-01-home-waitlisted.png,
portal-states-all.png.

Task: rebuild client/src/pages/portal/Home.tsx.

1. Port the JSX verbatim. The hero card switches based on client.stage:
   enquired | approved | waitlisted | puppy_reserved | puppy_booked |
   puppy_fully_paid | rejected. Keep that switch logic intact.
2. Wire client.stage to the real current-user/client hook already used
   elsewhere in the app. If it doesn't exist, stub with useQuery-compatible
   placeholder and TODO the expected endpoint.
3. The PortalJourney timeline component must render the 6-stage progression
   with `done`, `active`, and `upcoming` states driven by client.stage.
4. Mobile-first: must look right at 375px.
5. Tailwind classes unchanged.

Acceptance: manually set client.stage to each of the 7 values and screenshot —
compare against portal-states-all.png.
```

---

## PR B2 — Portal Litters

```
Port handoff/source/screens/portal.jsx component PortalLitters into
client/src/pages/portal/Litters.tsx. Reference: handoff/screenshots/portal-02-litters.png.

- JSX verbatim
- Replace sampleLitters with the real litters-for-client hook
- Mobile-first (375px baseline)
- Tailwind classes unchanged
- TODO any missing endpoint
```

---

## PR B3 — Portal Updates

```
Port handoff/source/screens/portal.jsx component PortalUpdates into
client/src/pages/portal/Updates.tsx. Reference: handoff/screenshots/portal-03-updates.png.

- JSX verbatim
- Replace sample update entries with the real breeder-updates feed hook
- Images use the Placeholder primitive until real photos ship
- Mobile-first, classes unchanged
```

---

## PR B4 — Portal Payments

```
Port handoff/source/screens/portal.jsx component PortalPayments into
client/src/pages/portal/Payments.tsx. Reference: handoff/screenshots/portal-04-payments.png.

- JSX verbatim
- Replace sample payments with the real payments-for-client hook
- DepositPill drives paid/pending status — reuse the existing primitive
- Mobile-first, classes unchanged
```

---

## PR B5 — Portal Documents

```
Port handoff/source/screens/portal.jsx component PortalDocuments into
client/src/pages/portal/Documents.tsx. Reference: handoff/screenshots/portal-05-documents.png.

- JSX verbatim
- Replace sample docs with the real documents-for-client hook
- Sign/download actions wire to the existing handlers used elsewhere
- Mobile-first, classes unchanged
```

---

## PR C — Polish

```
Final sweep on /portal/*:
1. Replace Placeholder components with real images where product has provided
   photography. List any screens still showing placeholders.
2. Empty-states for every list view — warm-400 muted tone, serif heading.
3. Keyboard focus rings: outline var(--brand-500) offset 2px.
4. Run axe-core against /portal/* routes; fix all serious violations.
5. Verify every portal screen at 375px, 768px, and 1440px.
```
