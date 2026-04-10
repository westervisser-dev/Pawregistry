CREATE TABLE IF NOT EXISTS "puppy_images" (
	"id" text PRIMARY KEY NOT NULL,
	"puppy_id" text NOT NULL,
	"url" text NOT NULL,
	"storage_path" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "puppy_images" ADD CONSTRAINT "puppy_images_puppy_id_puppies_id_fk" FOREIGN KEY ("puppy_id") REFERENCES "public"."puppies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
