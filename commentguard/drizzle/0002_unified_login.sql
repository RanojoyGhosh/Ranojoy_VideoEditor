ALTER TABLE "accounts" ADD COLUMN "api_flavor" text DEFAULT 'instagram' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "token_scopes" jsonb;