CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ig_user_id" text NOT NULL,
	"ig_scoped_id" text,
	"username" text NOT NULL,
	"account_type" text,
	"access_token_enc" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"token_expiry_estimated" boolean DEFAULT true NOT NULL,
	"token_refreshed_at" timestamp with time zone,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	CONSTRAINT "accounts_ig_user_id_unique" UNIQUE("ig_user_id")
);
--> statement-breakpoint
CREATE TABLE "action_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"action" text NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"comment_id" integer,
	"ig_comment_id" text,
	"snapshot" jsonb,
	"detail" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ig_comment_id" text NOT NULL,
	"post_id" integer NOT NULL,
	"parent_ig_comment_id" text,
	"from_id" text,
	"username" text,
	"text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"like_count" integer,
	"hidden" boolean DEFAULT false NOT NULL,
	"is_own" boolean DEFAULT false NOT NULL,
	"score" integer,
	"reasons" jsonb,
	"ai_label" text,
	"ai_confidence" integer,
	"ai_reason" text,
	"status" text DEFAULT 'new' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"gone_at" timestamp with time zone,
	CONSTRAINT "comments_ig_comment_id_unique" UNIQUE("ig_comment_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"ig_media_id" text NOT NULL,
	"caption" text,
	"permalink" text,
	"thumbnail_url" text,
	"media_type" text,
	"media_product_type" text,
	"comments_count" integer,
	"posted_at" timestamp with time zone NOT NULL,
	"monitored" boolean DEFAULT true NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"next_scan_at" timestamp with time zone,
	"last_scan_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_ig_media_id_unique" UNIQUE("ig_media_id")
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern" text NOT NULL,
	"type" text DEFAULT 'keyword' NOT NULL,
	"category" text DEFAULT 'custom' NOT NULL,
	"language" text,
	"weight" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"ig_user_id" text,
	"username" text NOT NULL,
	"type" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_queue" ADD CONSTRAINT "action_queue_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_queue_due_idx" ON "action_queue" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_ig_comment_id");--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comments_from_idx" ON "comments" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "comments_created_idx" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_posted_at_idx" ON "posts" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "posts_next_scan_idx" ON "posts" USING btree ("next_scan_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_lists_username_type_idx" ON "user_lists" USING btree ("username","type");