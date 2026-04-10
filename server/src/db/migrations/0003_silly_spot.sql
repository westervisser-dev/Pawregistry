DROP TABLE "dogs";--> statement-breakpoint
DROP TABLE "health_certs";--> statement-breakpoint
ALTER TABLE "litters" DROP CONSTRAINT "litters_sire_id_dogs_id_fk";
--> statement-breakpoint
ALTER TABLE "litters" DROP CONSTRAINT "litters_dam_id_dogs_id_fk";
--> statement-breakpoint
ALTER TABLE "puppies" DROP CONSTRAINT "puppies_dog_id_dogs_id_fk";
--> statement-breakpoint
ALTER TABLE "litters" DROP COLUMN IF EXISTS "sire_id";--> statement-breakpoint
ALTER TABLE "litters" DROP COLUMN IF EXISTS "dam_id";--> statement-breakpoint
ALTER TABLE "puppies" DROP COLUMN IF EXISTS "dog_id";