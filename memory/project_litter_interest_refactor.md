---
name: Litter interest & placed stage refactor
description: Active large refactor removing 'placed' client stage, adding litter-level interest, reworking puppy statuses and match flow
type: project
---

Major refactor in progress. Mid-implementation as of this session.

**Why:** Simplify client lifecycle — clients can self-signal litter interest, admin invites are informational only, puppy interest auto-triggers match_requested stage.

## New flows

**Client stage flow** (placed removed):
waitlisted → (client toggles litter interest, informational) → (admin invites via litter_notifications, no stage change) → client expresses puppy interest → auto: match_requested + litterId set → admin approves → auto: matched + puppy: matched → admin confirms payment → matched_paid + puppy: matched_paid. If admin rejects → client: waitlisted, litterId: null, puppy: available.

**New puppy statuses:** available → reserved (on client puppy interest) → matched (on admin approval) → matched_paid (on payment confirmation). retained / not_for_sale unchanged. 'placed' removed.

**Litter interest:** new litter_interests table, togglable by waitlisted+ clients, purely informational, no approval workflow.

## Completed phases

**Phase 1 — SQL migration** ✅ (user ran successfully)
- Rebuilt puppy_status enum: removed 'placed', added 'matched', 'matched_paid'
- Rebuilt client_stage enum: removed 'placed'
- Created litter_interests table with unique(client_id, litter_id)
- Fixed clients.stage default from 'enquiry' → 'enquired'

**Phase 2 — Schema & shared types** ✅
- server/src/db/schema.ts: updated both enums, fixed default, added litterInterests table + relations, wired into littersRelations and clientsRelations (renamed interests → puppyInterests in clientsRelations)
- shared/src/index.ts: updated PuppyStatus, ClientStage, added LitterInterest + LitterInterestWithClient types

## Remaining phases

**Phase 3 — Server routes** (next)
Files: server/src/routes/litters/index.ts, server/src/routes/clients/index.ts, server/src/lib/email.ts

litters/index.ts changes:
- NEW: POST /litters/:id/interest — toggle litter interest, auth required, waitlisted+
- NEW: GET /litters/:id/my-interest — returns { interested: boolean } for current client
- NEW: GET /admin/litter-interests/:litterId — list clients who flagged interest with name, deposit status, waitlist position
- MODIFY: POST /puppies/:puppyId/interest — keep notification gate; on create: puppy → reserved, client stage → match_requested, client litterId → puppy's litterId; check no active interest already
- MODIFY: PATCH /admin/interests/:interestId — approve: puppy → matched, client → matched, auto-reject others. Reject: puppy → available, client → waitlisted, litterId → null
- MODIFY: PATCH /puppies/:puppyId — if status manually set to 'available': find pending/approved interest, revert linked client → waitlisted, clear litterId, reject interest

clients/index.ts changes:
- Remove 'placed' from stage validation schema
- ACTIVE_QUEUE_STAGES: remove 'placed' → ['waitlisted', 'match_requested', 'matched']
- PATCH /admin/:id stage change: remove stage_placed email trigger; when stage → matched_paid: find approved puppyInterest for client, set linked puppy → matched_paid

email.ts changes:
- Remove placed: 'stage_placed' entry

**Phase 4 — Admin UI**
- AdminLitterDetail.tsx: puppy status dropdown remove 'placed' add 'matched'/'matched_paid'; add Litter Interest section showing interested clients; add shortcut to invite them to notification batch
- AdminClientDetail.tsx: remove 'placed' stage button, remove from ACTIVE_QUEUE_STAGES, add Litter Interests section
- AdminClients.tsx: remove 'placed' from stage filter + labels
- AdminEmails.tsx: remove stage_placed row

**Phase 5 — Portal UI**
- PortalDashboard.tsx: remove 'placed' stage card, remove from STAGES progress, remove from isPositiveStage
- PortalLitterDetail.tsx: add litter interest toggle button (waitlisted+), update puppy interest messaging, refresh authStore after expressing puppy interest
- PortalLitters.tsx: show 'Interested' badge on cards where client has flagged interest

## Key decisions
- litter_notifications table KEPT as gate for puppy-level interest (admin invites clients)
- Only one active puppy interest at a time per client
- litterId set on client when they express puppy interest (derived from puppy.litterId)
- matched_paid on client → auto sets linked puppy to matched_paid
- Admin manually setting puppy to 'available' cascades: revert linked client to waitlisted, clear litterId, reject interest
