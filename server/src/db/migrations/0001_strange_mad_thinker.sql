DO $$ BEGIN
 CREATE TYPE "public"."deposit_tier" AS ENUM('r5000', 'r500');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deposit_tier" "deposit_tier";