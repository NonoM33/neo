-- DocuSeal migration: replace Documenso columns with DocuSeal-native ones.
-- The Documenso integration is removed entirely; in-flight signature
-- requests (if any) are kept but their legacy id reference is dropped.

-- signature_requests is created (in its final shape) by a later migration.
-- On a fresh database the table does not exist yet, so guard with IF EXISTS:
-- these statements only matter when migrating a legacy Documenso-era database.
ALTER TABLE IF EXISTS "signature_requests" DROP COLUMN IF EXISTS "documenso_document_id";--> statement-breakpoint
ALTER TABLE IF EXISTS "signature_requests" ADD COLUMN IF NOT EXISTS "docuseal_submission_id" integer;--> statement-breakpoint
ALTER TABLE IF EXISTS "signature_requests" ADD COLUMN IF NOT EXISTS "docuseal_slug" varchar(64);
