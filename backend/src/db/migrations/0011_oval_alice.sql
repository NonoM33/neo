ALTER TABLE "roles" ALTER COLUMN "name" SET DATA TYPE varchar(50) USING "name"::text;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;