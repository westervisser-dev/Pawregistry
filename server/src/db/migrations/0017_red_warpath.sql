ALTER TABLE "litters" ADD COLUMN "launched_at" timestamp with time zone;
--> statement-breakpoint
-- Backfill: for existing litters that already have rows in litter_notifications,
-- set launched_at to the earliest notifiedAt so they are treated as already launched.
UPDATE "litters" l
SET "launched_at" = sub.first_notified
FROM (
	SELECT "litter_id", MIN("notified_at") AS first_notified
	FROM "litter_notifications"
	GROUP BY "litter_id"
) sub
WHERE l.id = sub."litter_id";