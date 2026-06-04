CREATE TYPE "public"."changelog_category" AS ENUM('nouveaute', 'amelioration', 'correction');--> statement-breakpoint
CREATE TYPE "public"."email_campaign_status" AS ENUM('brouillon', 'envoi', 'envoyee', 'echec');--> statement-breakpoint
CREATE TYPE "public"."email_recipient_status" AS ENUM('en_attente', 'envoye', 'ouvert', 'echec', 'desinscrit');--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('brouillon', 'publiee');--> statement-breakpoint
CREATE TABLE "changelog_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text NOT NULL,
	"category" "changelog_category" DEFAULT 'nouveaute' NOT NULL,
	"is_highlight" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"client_id" uuid,
	"email" varchar(255) NOT NULL,
	"token" varchar(64) NOT NULL,
	"status" "email_recipient_status" DEFAULT 'en_attente' NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"open_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_campaign_recipients_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" varchar(300) NOT NULL,
	"html" text NOT NULL,
	"status" "email_campaign_status" DEFAULT 'brouillon' NOT NULL,
	"selected_entry_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"opened_count" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(120),
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_optouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"client_id" uuid,
	"reason" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_optouts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "release_status" DEFAULT 'brouillon' NOT NULL,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "releases_version_unique" UNIQUE("version")
);
--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_optouts" ADD CONSTRAINT "email_optouts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changelog_entries_release_id_idx" ON "changelog_entries" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "changelog_entries_category_idx" ON "changelog_entries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "email_campaign_recipients_campaign_id_idx" ON "email_campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "email_campaign_recipients_token_idx" ON "email_campaign_recipients" USING btree ("token");--> statement-breakpoint
CREATE INDEX "email_campaign_recipients_status_idx" ON "email_campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_optouts_email_idx" ON "email_optouts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "releases_status_idx" ON "releases" USING btree ("status");