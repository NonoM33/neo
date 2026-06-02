ALTER TABLE "recette_feedback" ADD COLUMN "gitlab_issue_iid" integer;--> statement-breakpoint
ALTER TABLE "recette_feedback" ADD COLUMN "gitlab_issue_url" varchar(500);