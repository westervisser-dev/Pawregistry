ALTER TABLE "litters" ADD COLUMN "selection_date" text NOT NULL;--> statement-breakpoint
ALTER TABLE "litters" ADD COLUMN "go_home_date" text;--> statement-breakpoint
ALTER TABLE "litters" DROP COLUMN IF EXISTS "whelp_date";--> statement-breakpoint
ALTER TABLE "litters" DROP COLUMN IF EXISTS "expected_date";