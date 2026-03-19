CREATE TABLE IF NOT EXISTS "document_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"category" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_template_checklist" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"template_id" text NOT NULL,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_template_checklist_client_id_template_id_unique" UNIQUE("client_id","template_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_template_checklist" ADD CONSTRAINT "client_template_checklist_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_template_checklist" ADD CONSTRAINT "client_template_checklist_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
