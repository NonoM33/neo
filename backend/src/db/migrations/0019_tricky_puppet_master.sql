ALTER TYPE "public"."room_type" ADD VALUE 'toilette' BEFORE 'autre';--> statement-breakpoint
ALTER TYPE "public"."room_type" ADD VALUE 'entree' BEFORE 'autre';--> statement-breakpoint
ALTER TYPE "public"."room_type" ADD VALUE 'dressing' BEFORE 'autre';--> statement-breakpoint
ALTER TYPE "public"."room_type" ADD VALUE 'placard' BEFORE 'autre';--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;