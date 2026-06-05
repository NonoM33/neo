CREATE TYPE "public"."template_kind" AS ENUM('email', 'document');--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"kind" "template_kind" NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"subject" text,
	"html" text NOT NULL,
	"gjs_data" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templates_key_unique" UNIQUE("key")
);
