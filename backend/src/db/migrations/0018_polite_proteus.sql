ALTER TABLE "rooms" ADD COLUMN "icon" varchar(50);--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "linked_room_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;