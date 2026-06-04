CREATE TYPE "public"."chatbot_message_role" AS ENUM('visitor', 'bot', 'staff', 'system');--> statement-breakpoint
CREATE TYPE "public"."chatbot_mode" AS ENUM('bot', 'human');--> statement-breakpoint
CREATE TYPE "public"."chatbot_session_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TABLE "chatbot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "chatbot_message_role" NOT NULL,
	"content" text NOT NULL,
	"author_staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" varchar(100) NOT NULL,
	"status" "chatbot_session_status" DEFAULT 'active' NOT NULL,
	"mode" "chatbot_mode" DEFAULT 'bot' NOT NULL,
	"assigned_staff_id" uuid,
	"visitor_name" varchar(200),
	"visitor_email" varchar(255),
	"visitor_phone" varchar(30),
	"lead_id" uuid,
	"page_url" text,
	"user_agent" text,
	"unread_for_staff" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_session_id_chatbot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chatbot_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_author_staff_id_users_id_fk" FOREIGN KEY ("author_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;