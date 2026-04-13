ALTER TABLE "litters" DROP CONSTRAINT "litters_sire_id_fkey";
ALTER TABLE "litters" DROP CONSTRAINT "litters_dam_id_fkey";
ALTER TABLE "puppies" DROP CONSTRAINT "puppies_dog_id_fkey";
ALTER TABLE "litters" DROP COLUMN IF EXISTS "sire_id";
ALTER TABLE "litters" DROP COLUMN IF EXISTS "dam_id";
ALTER TABLE "puppies" DROP COLUMN IF EXISTS "dog_id";
DROP TABLE "health_certs";
DROP TABLE "dogs";