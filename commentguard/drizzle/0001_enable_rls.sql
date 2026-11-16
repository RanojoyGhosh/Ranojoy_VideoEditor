-- Supabase exposes tables in "public" through its auto-generated REST API (anon key).
-- CommentGuard never uses that API; it connects directly as the table owner, which
-- bypasses RLS. Enabling RLS with no policies blocks every API request.
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "action_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
