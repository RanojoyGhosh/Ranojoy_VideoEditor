/**
 * Database schema (Postgres, via Drizzle ORM).
 *
 * All tables from the spec are created up front so later build steps only add
 * columns, never restructure. Times are stored as timestamptz (UTC); the panel
 * shows them in IST.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

/** The connected Instagram professional account (one row in Phase 1). */
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  /** Instagram professional account ID (`user_id` from /me; used in webhooks). */
  igUserId: text("ig_user_id").notNull().unique(),
  /** App-scoped ID (`id` from /me). Kept so "is this my comment?" can match either. */
  igScopedId: text("ig_scoped_id"),
  username: text("username").notNull(),
  accountType: text("account_type"),
  /** Long-lived access token, AES-256-GCM encrypted (see lib/crypto.ts). */
  accessTokenEnc: text("access_token_enc").notNull(),
  tokenExpiresAt: ts("token_expires_at"),
  /** True until the first successful refresh tells us the real expiry. */
  tokenExpiryEstimated: boolean("token_expiry_estimated").notNull().default(true),
  tokenRefreshedAt: ts("token_refreshed_at"),
  connectedAt: ts("connected_at").notNull().defaultNow(),
  lastError: text("last_error"),
  lastErrorAt: ts("last_error_at"),
});

/** My posts and reels. */
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    igMediaId: text("ig_media_id").notNull().unique(),
    caption: text("caption"),
    permalink: text("permalink"),
    thumbnailUrl: text("thumbnail_url"),
    mediaType: text("media_type"),
    mediaProductType: text("media_product_type"),
    commentsCount: integer("comments_count"),
    postedAt: ts("posted_at").notNull(),
    monitored: boolean("monitored").notNull().default(true),
    lastScannedAt: ts("last_scanned_at"),
    nextScanAt: ts("next_scan_at"),
    lastScanError: text("last_scan_error"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("posts_posted_at_idx").on(t.postedAt), index("posts_next_scan_idx").on(t.nextScanAt)],
);

export const COMMENT_STATUSES = [
  "new", // stored, not yet scored
  "kept", // decided: genuine / no action
  "review", // waiting for my decision
  "queued", // hide/delete queued
  "hidden",
  "deleted",
  "failed",
] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

/** Every comment and reply on my posts. */
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    igCommentId: text("ig_comment_id").notNull().unique(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    /** Set when this is a reply; the top-level comment it sits under. */
    parentIgCommentId: text("parent_ig_comment_id"),
    fromId: text("from_id"),
    username: text("username"),
    text: text("text").notNull().default(""),
    /** When it was posted on Instagram. */
    createdAt: ts("created_at").notNull(),
    likeCount: integer("like_count"),
    hidden: boolean("hidden").notNull().default(false),
    /** Written by my own account. Never scored, hidden or deleted. */
    isOwn: boolean("is_own").notNull().default(false),
    score: integer("score"),
    reasons: jsonb("reasons").$type<{ code: string; label: string; weight: number }[]>(),
    aiLabel: text("ai_label"),
    aiConfidence: integer("ai_confidence"),
    aiReason: text("ai_reason"),
    status: text("status").$type<CommentStatus>().notNull().default("new"),
    decidedBy: text("decided_by").$type<"auto" | "me">(),
    decidedAt: ts("decided_at"),
    firstSeenAt: ts("first_seen_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    /** No longer returned by Instagram (deleted by me in the app, or by Instagram). */
    goneAt: ts("gone_at"),
  },
  (t) => [
    index("comments_post_idx").on(t.postId),
    index("comments_parent_idx").on(t.parentIgCommentId),
    index("comments_status_idx").on(t.status),
    index("comments_from_idx").on(t.fromId),
    index("comments_created_idx").on(t.createdAt),
  ],
);

/** Delayed hide/delete actions (worker picks one due item per tick). Used from Step 3. */
export const actionQueue = pgTable(
  "action_queue",
  {
    id: serial("id").primaryKey(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    action: text("action").$type<"hide" | "delete" | "unhide">().notNull(),
    runAt: ts("run_at").notNull(),
    status: text("status")
      .$type<"pending" | "running" | "done" | "failed" | "cancelled">()
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    batchId: text("batch_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
    doneAt: ts("done_at"),
  },
  (t) => [index("action_queue_due_idx").on(t.status, t.runAt)],
);

/** Whitelist / blocklist of Instagram users. Used from Step 2. */
export const userLists = pgTable(
  "user_lists",
  {
    id: serial("id").primaryKey(),
    igUserId: text("ig_user_id"),
    username: text("username").notNull(),
    type: text("type").$type<"whitelist" | "blocklist">().notNull(),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_lists_username_type_idx").on(t.username, t.type)],
);

/** Editable detection rules (keywords / regex with weights). Used from Step 2. */
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  type: text("type").$type<"keyword" | "regex">().notNull().default("keyword"),
  /** e.g. contact / job_bait / safe — groups chips in the panel. */
  category: text("category").notNull().default("custom"),
  language: text("language"),
  /** Positive = more spammy, negative = safe word. */
  weight: integer("weight").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Key/value settings (JSON values). Defaults live in lib/settings.ts. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Append-only log; every hide/delete stores a full comment snapshot first. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    action: text("action").notNull(),
    commentId: integer("comment_id"),
    igCommentId: text("ig_comment_id"),
    snapshot: jsonb("snapshot"),
    detail: text("detail"),
    at: ts("at").notNull().defaultNow(),
    by: text("by").$type<"auto" | "me" | "system">().notNull().default("system"),
  },
  (t) => [index("audit_log_at_idx").on(t.at)],
);

export type Account = typeof accounts.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
