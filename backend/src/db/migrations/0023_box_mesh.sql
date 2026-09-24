ALTER TABLE "boxes" ADD COLUMN "mesh_hostname" varchar(64);--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "mesh_auth_key_pending" text;--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "mesh_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "boxes" ADD COLUMN "mesh_last_seen_at" timestamp;