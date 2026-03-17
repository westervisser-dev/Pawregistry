DO $$ BEGIN
 CREATE TYPE "public"."client_stage" AS ENUM('enquiry', 'reviewed', 'waitlisted', 'matched', 'placed', 'declined');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_type" AS ENUM('contract', 'health_record', 'go_home_pack', 'invoice', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dog_sex" AS ENUM('male', 'female');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dog_status" AS ENUM('active', 'retired', 'deceased');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."health_cert_result" AS ENUM('pass', 'fail', 'pending', 'excellent', 'good', 'fair');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."health_cert_type" AS ENUM('ofa_hips', 'ofa_elbows', 'ofa_eyes', 'ofa_heart', 'dna_panel', 'brucellosis', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."litter_status" AS ENUM('planned', 'confirmed', 'born', 'weaning', 'ready', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_author" AS ENUM('admin', 'client');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."puppy_status" AS ENUM('available', 'reserved', 'placed', 'retained', 'not_for_sale');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."update_target_type" AS ENUM('litter', 'puppy', 'client');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"city" text,
	"country" text DEFAULT 'ZA' NOT NULL,
	"stage" "client_stage" DEFAULT 'enquiry' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"puppy_id" text,
	"litter_id" text,
	"application_data" jsonb NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"puppy_id" text,
	"type" "document_type" NOT NULL,
	"label" text NOT NULL,
	"file_url" text NOT NULL,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dogs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"call_name" text,
	"registered_name" text,
	"breed" text NOT NULL,
	"sex" "dog_sex" NOT NULL,
	"dob" text NOT NULL,
	"colour" text NOT NULL,
	"status" "dog_status" DEFAULT 'active' NOT NULL,
	"sire_id" text,
	"dam_id" text,
	"microchip_number" text,
	"registration_number" text,
	"profile_image_url" text,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "go_home_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"puppy_id" text NOT NULL,
	"vet_check_done" boolean DEFAULT false NOT NULL,
	"microchip_registered" boolean DEFAULT false NOT NULL,
	"contract_signed" boolean DEFAULT false NOT NULL,
	"deposit_paid" boolean DEFAULT false NOT NULL,
	"balance_paid" boolean DEFAULT false NOT NULL,
	"puppy_pack_prepared" boolean DEFAULT false NOT NULL,
	"go_home_date" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_certs" (
	"id" text PRIMARY KEY NOT NULL,
	"dog_id" text NOT NULL,
	"type" "health_cert_type" NOT NULL,
	"result" "health_cert_result" NOT NULL,
	"cert_number" text,
	"issued_by" text,
	"issued_at" text NOT NULL,
	"expires_at" text,
	"document_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "litters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sire_id" text NOT NULL,
	"dam_id" text NOT NULL,
	"status" "litter_status" DEFAULT 'planned' NOT NULL,
	"whelp_date" text,
	"expected_date" text,
	"puppy_count" integer,
	"available_count" integer,
	"deposit_amount" real,
	"purchase_price" real,
	"notes" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"author" "message_author" NOT NULL,
	"body" text NOT NULL,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "puppies" (
	"id" text PRIMARY KEY NOT NULL,
	"litter_id" text NOT NULL,
	"dog_id" text,
	"collar_colour" text NOT NULL,
	"sex" "dog_sex" NOT NULL,
	"colour" text NOT NULL,
	"status" "puppy_status" DEFAULT 'available' NOT NULL,
	"birth_weight" real,
	"current_weight" real,
	"notes" text,
	"profile_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "updates" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_type" "update_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"week_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_puppy_id_puppies_id_fk" FOREIGN KEY ("puppy_id") REFERENCES "public"."puppies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_litter_id_litters_id_fk" FOREIGN KEY ("litter_id") REFERENCES "public"."litters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_puppy_id_puppies_id_fk" FOREIGN KEY ("puppy_id") REFERENCES "public"."puppies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "go_home_checklists" ADD CONSTRAINT "go_home_checklists_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "go_home_checklists" ADD CONSTRAINT "go_home_checklists_puppy_id_puppies_id_fk" FOREIGN KEY ("puppy_id") REFERENCES "public"."puppies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_certs" ADD CONSTRAINT "health_certs_dog_id_dogs_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "litters" ADD CONSTRAINT "litters_sire_id_dogs_id_fk" FOREIGN KEY ("sire_id") REFERENCES "public"."dogs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "litters" ADD CONSTRAINT "litters_dam_id_dogs_id_fk" FOREIGN KEY ("dam_id") REFERENCES "public"."dogs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "puppies" ADD CONSTRAINT "puppies_litter_id_litters_id_fk" FOREIGN KEY ("litter_id") REFERENCES "public"."litters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "puppies" ADD CONSTRAINT "puppies_dog_id_dogs_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
