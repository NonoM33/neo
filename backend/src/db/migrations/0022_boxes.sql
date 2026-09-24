CREATE TYPE "public"."box_status" AS ENUM('unclaimed', 'claimed', 'enrolled', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."box_support_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "box_support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"box_id" uuid NOT NULL,
	"status" "box_support_status" DEFAULT 'open' NOT NULL,
	"note" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"closed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "boxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provisioning_token_hash" varchar(64) NOT NULL,
	"token_suffix" varchar(4) NOT NULL,
	"hardware_id" varchar(100),
	"status" "box_status" DEFAULT 'unclaimed' NOT NULL,
	"client_id" uuid,
	"api_key_hash" varchar(64),
	"api_key_pending" text,
	"version" varchar(50),
	"error_code" varchar(8),
	"telemetry" jsonb,
	"ip_address" varchar(45),
	"hostname" varchar(100),
	"zigbee_devices" integer DEFAULT 0,
	"last_seen_at" timestamp,
	"claimed_at" timestamp,
	"claimed_by" uuid,
	"enrolled_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "boxes_provisioning_token_hash_unique" UNIQUE("provisioning_token_hash"),
	CONSTRAINT "boxes_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
ALTER TABLE "box_support_requests" ADD CONSTRAINT "box_support_requests_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_support_requests" ADD CONSTRAINT "box_support_requests_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;