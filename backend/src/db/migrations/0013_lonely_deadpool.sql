CREATE TABLE "configurator_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"payload" jsonb NOT NULL,
	"total_ttc" numeric(12, 2),
	"lead_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "configurator_drafts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "configurator_drafts" ADD CONSTRAINT "configurator_drafts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;