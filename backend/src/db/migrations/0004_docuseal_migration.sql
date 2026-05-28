-- DocuSeal migration: replace Documenso columns with DocuSeal-native ones.
-- The Documenso integration is removed entirely; in-flight signature
-- requests (if any) are kept but their legacy id reference is dropped.

ALTER TABLE "signature_requests" DROP COLUMN IF EXISTS "documenso_document_id";--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN IF NOT EXISTS "docuseal_submission_id" integer;--> statement-breakpoint
ALTER TABLE "signature_requests" ADD COLUMN IF NOT EXISTS "docuseal_slug" varchar(64);
