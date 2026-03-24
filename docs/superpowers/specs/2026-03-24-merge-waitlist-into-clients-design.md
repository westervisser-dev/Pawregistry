# Merge Waitlist into Clients Page — Design Spec

**Date:** 2026-03-24

## Overview

Merge the standalone `/admin/waitlist` page into the `/admin/clients` page. The waitlist reorder UI becomes the view rendered when the "waitlisted" stage filter is active on the clients page. The separate waitlist nav entry and route are removed.

## Goals

- Consolidate two related admin views into one coherent page
- Reduce nav clutter
- Keep all existing functionality intact

## Non-Goals

- No backend changes
- No changes to the reorder endpoint or data model
- No changes to any other stage tab views

## Design

### `/admin/clients` page behaviour

- Stage filter tabs remain unchanged: All, enquiry, reviewed, waitlisted, matched, placed, declined
- For all tabs **except** `waitlisted`: render the existing standard table (Name, Preference, Stage, Deposit status, Applied date, View)
- For the `waitlisted` tab: render the split reorderable view with two sections:
  - **Priority — Deposit** — clients where `depositStatus` is `pending` or `paid`, sorted by `priority` ascending
  - **Standard — No Deposit** — clients where `depositStatus` is `none`, sorted by `priority` ascending
  - Each section lists clients with up/down arrow buttons to reorder within the section
  - Reordering persists via `api.clients.admin.waitlist.reorder.patch({ order: [{ id, priority }] })`
  - Each client row links to `/admin/clients/:id`

### Nav & routing

- Remove "Waitlist" nav item from `AdminLayout.tsx`
- Remove the `/admin/waitlist` route from `client/src/main.tsx`
- The `AdminWaitlist` component's reorder logic is extracted and reused inline within `AdminClients`

## Files to Change

| File | Change |
|---|---|
| `client/src/pages/admin/index.tsx` | Add conditional waitlist view inside `AdminClients`; remove `AdminWaitlist` component |
| `client/src/components/ui/AdminLayout.tsx` | Remove Waitlist nav item |
| `client/src/main.tsx` | Remove `/admin/waitlist` route |

## No Backend Changes Required

The existing `PATCH /clients/admin/waitlist/reorder` endpoint handles all reorder operations. The `GET /clients/admin` endpoint already returns waitlisted clients when `stage=waitlisted` is passed.
