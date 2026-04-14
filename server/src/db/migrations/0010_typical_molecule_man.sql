-- Rename client_stage enum values: match_requested → puppy_reserved, matched → puppy_booked, matched_paid → puppy_fully_paid
ALTER TYPE "client_stage" ADD VALUE IF NOT EXISTS 'puppy_reserved';--> statement-breakpoint
ALTER TYPE "client_stage" ADD VALUE IF NOT EXISTS 'puppy_booked';--> statement-breakpoint
ALTER TYPE "client_stage" ADD VALUE IF NOT EXISTS 'puppy_fully_paid';--> statement-breakpoint

-- Migrate existing client data to new stage values
UPDATE "clients" SET "stage" = 'puppy_reserved' WHERE "stage" = 'match_requested';--> statement-breakpoint
UPDATE "clients" SET "stage" = 'puppy_booked' WHERE "stage" = 'matched';--> statement-breakpoint
UPDATE "clients" SET "stage" = 'puppy_fully_paid' WHERE "stage" = 'matched_paid';--> statement-breakpoint

-- Rename puppy_status enum values: matched → (removed), matched_paid → puppy_fully_paid
ALTER TYPE "puppy_status" ADD VALUE IF NOT EXISTS 'puppy_fully_paid';--> statement-breakpoint

-- Migrate existing puppy data to new status values
UPDATE "puppies" SET "status" = 'booked' WHERE "status" = 'matched';--> statement-breakpoint
UPDATE "puppies" SET "status" = 'puppy_fully_paid' WHERE "status" = 'matched_paid';
