CREATE TYPE "public"."comment_entity_type" AS ENUM('client', 'project', 'lead');--> statement-breakpoint
CREATE TABLE "entity_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "comment_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" varchar(201) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_comments" ADD CONSTRAINT "entity_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_comments_entity_idx" ON "entity_comments" USING btree ("entity_type","entity_id");