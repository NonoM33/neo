CREATE TYPE "public"."recette_validation" AS ENUM('a_tester', 'valide', 'a_corriger');--> statement-breakpoint
ALTER TABLE "recette_features" ADD COLUMN "validation_status" "recette_validation" DEFAULT 'a_tester' NOT NULL;--> statement-breakpoint
ALTER TABLE "recette_features" ADD COLUMN "validated_by" varchar(120);--> statement-breakpoint
ALTER TABLE "recette_features" ADD COLUMN "validated_at" timestamp;--> statement-breakpoint
CREATE INDEX "recette_features_validation_idx" ON "recette_features" USING btree ("validation_status");