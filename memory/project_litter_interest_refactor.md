---
name: Client stage rename & automatic booking flow
description: Renamed client stages (puppy_reserved, puppy_booked, puppy_fully_paid) and removed admin approval step — bookings are now automatic
type: project
---

Completed 2026-04-14. Renamed client stages and removed admin approval from booking flow.

**Why:** Admins don't need to confirm puppy requests — the process is fully automatic. Admins can only move a reserved/booked puppy back to available.

## Stage renames (DB values)
- `match_requested` → `puppy_reserved` (R500/no-deposit client reserves a puppy)
- `matched` → `puppy_booked` (R5000 client reserves, or R500/no-deposit client pays booking deposit)
- `matched_paid` → `puppy_fully_paid` (final payment received)

## Puppy status changes
- Removed `matched` status (no longer needed without admin approval step)
- `matched_paid` → `puppy_fully_paid`
- Flow is now: available → reserved (24h hold) → booked (payment confirmed) → puppy_fully_paid

## Business logic changes
- Admin notifying clients of a litter does NOT change their status
- R500/no-deposit clients now move to `puppy_reserved` when expressing interest (previously stayed at `waitlisted`)
- Booking payment auto-sets `puppyId`, `matchedAt`, and auto-rejects other pending interests
- Admin approve/reject endpoint simplified to reject-only (move puppy back to available)
