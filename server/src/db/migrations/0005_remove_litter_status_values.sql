-- Migrate any existing rows off the removed statuses
UPDATE litters SET status = 'planned' WHERE status = 'confirmed';
UPDATE litters SET status = 'born' WHERE status = 'weaning';
--> statement-breakpoint
-- Drop the default, recreate the enum, restore the default
ALTER TABLE litters ALTER COLUMN status DROP DEFAULT;
--> statement-breakpoint
ALTER TYPE litter_status RENAME TO litter_status_old;
--> statement-breakpoint
CREATE TYPE litter_status AS ENUM ('planned', 'born', 'available', 'completed');
--> statement-breakpoint
ALTER TABLE litters ALTER COLUMN status TYPE litter_status USING status::text::litter_status;
--> statement-breakpoint
DROP TYPE litter_status_old;
--> statement-breakpoint
ALTER TABLE litters ALTER COLUMN status SET DEFAULT 'planned';
