CREATE TYPE "public"."recette_kind" AS ENUM('bug', 'amelioration');--> statement-breakpoint
ALTER TABLE "recette_feedback" ALTER COLUMN "feature_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD COLUMN "app" "recette_app";--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD COLUMN "kind" "recette_kind" DEFAULT 'bug' NOT NULL;--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD COLUMN "source" varchar(20) DEFAULT 'recette' NOT NULL;--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD COLUMN "reporter_email" varchar(200);--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD COLUMN "context" jsonb;--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD COLUMN "notified_at" timestamp;--> statement-breakpoint
CREATE INDEX "recette_feedback_reporter_email_idx" ON "recette_feedback" USING btree ("reporter_email");--> statement-breakpoint
CREATE INDEX "recette_feedback_source_idx" ON "recette_feedback" USING btree ("source");