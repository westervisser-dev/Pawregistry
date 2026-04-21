ALTER TABLE "litters" ADD COLUMN "estimated_adult_weight_min_kg" real;--> statement-breakpoint
ALTER TABLE "litters" ADD COLUMN "estimated_adult_weight_max_kg" real;--> statement-breakpoint
ALTER TABLE "litters" ADD COLUMN "estimated_adult_height_min_cm" real;--> statement-breakpoint
ALTER TABLE "litters" ADD COLUMN "estimated_adult_height_max_cm" real;--> statement-breakpoint
UPDATE "litters" SET "estimated_adult_weight_min_kg" = "estimated_adult_weight_kg", "estimated_adult_weight_max_kg" = "estimated_adult_weight_kg" WHERE "estimated_adult_weight_kg" IS NOT NULL;--> statement-breakpoint
UPDATE "litters" SET "estimated_adult_height_min_cm" = "estimated_adult_height_cm", "estimated_adult_height_max_cm" = "estimated_adult_height_cm" WHERE "estimated_adult_height_cm" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "litters" DROP COLUMN IF EXISTS "estimated_adult_weight_kg";--> statement-breakpoint
ALTER TABLE "litters" DROP COLUMN IF EXISTS "estimated_adult_height_cm";
