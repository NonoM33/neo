CREATE TYPE "public"."call_status" AS ENUM('uploading', 'transcribing', 'analyzing', 'done', 'error');--> statement-breakpoint
CREATE TYPE "public"."sms_status" AS ENUM('pending', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tracking_status" AS ENUM('pending', 'active', 'arrived', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cloud_instance_status" AS ENUM('provisioning', 'running', 'stopped', 'error', 'destroying');--> statement-breakpoint
CREATE TYPE "public"."signature_status" AS ENUM('draft', 'pending', 'signed', 'declined', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recette_app" AS ENUM('admin', 'crm', 'flutter', 'site');--> statement-breakpoint
CREATE TYPE "public"."recette_severity" AS ENUM('bloquant', 'majeur', 'mineur', 'cosmetique');--> statement-breakpoint
CREATE TYPE "public"."recette_status" AS ENUM('ouvert', 'corrige', 'valide', 'a_revoir');--> statement-breakpoint
CREATE TABLE "call_recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"activity_id" uuid,
	"audio_url" text,
	"audio_bucket" varchar(100),
	"audio_key" varchar(500),
	"duration" integer,
	"file_size" integer,
	"mime_type" varchar(100) DEFAULT 'audio/webm',
	"transcription" text,
	"transcription_language" varchar(10) DEFAULT 'fr',
	"ai_analysis" jsonb,
	"status" "call_status" DEFAULT 'uploading' NOT NULL,
	"error_message" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"status" "sms_status" DEFAULT 'pending' NOT NULL,
	"client_id" uuid,
	"sent_by_id" uuid,
	"context" varchar(100),
	"context_id" uuid,
	"api_response" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_location_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"accuracy" numeric(6, 2),
	"heading" numeric(5, 2),
	"speed" numeric(6, 2),
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(128) NOT NULL,
	"appointment_id" uuid NOT NULL,
	"auditor_id" uuid NOT NULL,
	"client_id" uuid,
	"status" "tracking_status" DEFAULT 'pending' NOT NULL,
	"destination_address" text,
	"destination_lat" numeric(10, 7),
	"destination_lng" numeric(10, 7),
	"current_lat" numeric(10, 7),
	"current_lng" numeric(10, 7),
	"current_location_updated_at" timestamp,
	"eta_minutes" integer,
	"eta_updated_at" timestamp,
	"sms_sent_at" timestamp,
	"sms_phone_number" varchar(20),
	"started_at" timestamp,
	"arrived_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracking_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "cloud_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"tenant_id" varchar(100) NOT NULL,
	"container_id" varchar(100),
	"container_name" varchar(200),
	"domain" varchar(255) NOT NULL,
	"status" "cloud_instance_status" DEFAULT 'provisioning' NOT NULL,
	"ha_version" varchar(50),
	"admin_token" text,
	"client_token" text,
	"port" integer,
	"last_heartbeat" timestamp,
	"entity_count" integer DEFAULT 0,
	"automation_count" integer DEFAULT 0,
	"is_online" boolean DEFAULT false,
	"memory_limit_mb" integer DEFAULT 512,
	"cpu_limit" varchar(10) DEFAULT '0.5',
	"config" jsonb,
	"error_message" text,
	"provisioned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cloud_instances_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "floor_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"width_meters" real DEFAULT 10 NOT NULL,
	"height_meters" real DEFAULT 8 NOT NULL,
	"pixels_per_meter" real DEFAULT 100 NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"usdz_file_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"docuseal_submission_id" integer,
	"docuseal_slug" varchar(64),
	"status" "signature_status" DEFAULT 'draft' NOT NULL,
	"mode" varchar(20) DEFAULT 'remote' NOT NULL,
	"signer_name" varchar(200) NOT NULL,
	"signer_email" varchar(255) NOT NULL,
	"signing_url" text,
	"signature_data" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recette_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(120) NOT NULL,
	"app" "recette_app" NOT NULL,
	"module" varchar(120) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"route" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recette_features_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "recette_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"severity" "recette_severity" DEFAULT 'majeur' NOT NULL,
	"status" "recette_status" DEFAULT 'ouvert' NOT NULL,
	"steps_to_reproduce" text,
	"screenshot_key" varchar(300),
	"author" varchar(120) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recette_feedback_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"author" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_dependencies" ADD COLUMN "covered_quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "public_token" varchar(64);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "reminder_2h_sent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "reminder_30m_sent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_log" ADD CONSTRAINT "sms_log_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_log" ADD CONSTRAINT "sms_log_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_location_history" ADD CONSTRAINT "tracking_location_history_session_id_tracking_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tracking_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_instances" ADD CONSTRAINT "cloud_instances_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD CONSTRAINT "recette_feedback_feature_id_recette_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."recette_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recette_feedback_comments" ADD CONSTRAINT "recette_feedback_comments_feedback_id_recette_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."recette_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracking_location_history_session_id_idx" ON "tracking_location_history" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "tracking_location_history_recorded_at_idx" ON "tracking_location_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "tracking_sessions_token_idx" ON "tracking_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "tracking_sessions_appointment_id_idx" ON "tracking_sessions" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "tracking_sessions_auditor_id_idx" ON "tracking_sessions" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "tracking_sessions_status_idx" ON "tracking_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recette_features_app_idx" ON "recette_features" USING btree ("app");--> statement-breakpoint
CREATE INDEX "recette_features_module_idx" ON "recette_features" USING btree ("module");--> statement-breakpoint
CREATE INDEX "recette_feedback_feature_id_idx" ON "recette_feedback" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "recette_feedback_status_idx" ON "recette_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recette_feedback_severity_idx" ON "recette_feedback" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "recette_feedback_comments_feedback_id_idx" ON "recette_feedback_comments" USING btree ("feedback_id");