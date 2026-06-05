CREATE TYPE "public"."campaign_audience" AS ENUM('clients', 'leads', 'custom');--> statement-breakpoint
CREATE TYPE "public"."promo_discount_type" AS ENUM('pourcentage', 'montant_fixe');--> statement-breakpoint
CREATE TYPE "public"."marketing_campaign_status" AS ENUM('brouillon', 'programmee', 'envoi', 'envoyee', 'echec');--> statement-breakpoint
CREATE TYPE "public"."popup_frequency" AS ENUM('toujours', 'une_fois_session', 'une_fois_jour');--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" varchar(300) NOT NULL,
	"link_url" varchar(500),
	"link_label" varchar(80),
	"bg_color" varchar(20) DEFAULT '#0d6efd' NOT NULL,
	"text_color" varchar(20) DEFAULT '#ffffff' NOT NULL,
	"dismissible" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"client_id" uuid,
	"email" varchar(255) NOT NULL,
	"status" "email_recipient_status" DEFAULT 'en_attente' NOT NULL,
	"sent_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"html" text NOT NULL,
	"audience" "campaign_audience" DEFAULT 'clients' NOT NULL,
	"custom_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"promo_code_id" uuid,
	"status" "marketing_campaign_status" DEFAULT 'brouillon' NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"created_by" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "popups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"image_url" varchar(500),
	"cta_label" varchar(80),
	"cta_url" varchar(500),
	"promo_code_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"delay_seconds" integer DEFAULT 3 NOT NULL,
	"frequency" "popup_frequency" DEFAULT 'une_fois_session' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" text,
	"discount_type" "promo_discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_order_ht" numeric(12, 2),
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"per_client_once" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promo_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"quote_id" uuid,
	"client_id" uuid,
	"email" varchar(255),
	"discount_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "promo_code" varchar(40);--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "promo_discount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketing_campaign_recipients" ADD CONSTRAINT "marketing_campaign_recipients_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaign_recipients" ADD CONSTRAINT "marketing_campaign_recipients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "popups" ADD CONSTRAINT "popups_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banners_active_idx" ON "banners" USING btree ("active");--> statement-breakpoint
CREATE INDEX "marketing_campaign_recipients_campaign_idx" ON "marketing_campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "marketing_campaign_recipients_status_idx" ON "marketing_campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketing_campaigns_status_idx" ON "marketing_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "popups_active_idx" ON "popups" USING btree ("active");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promo_codes_active_idx" ON "promo_codes" USING btree ("active");--> statement-breakpoint
CREATE INDEX "promo_redemptions_code_idx" ON "promo_redemptions" USING btree ("promo_code_id");--> statement-breakpoint
CREATE INDEX "promo_redemptions_quote_idx" ON "promo_redemptions" USING btree ("quote_id");