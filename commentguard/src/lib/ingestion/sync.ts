/**
 * Ingestion: copy my posts and every comment + reply into the database.
 * De-duplicated by Instagram ID; decisions already made are never overwritten.
 */
import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { isOwnComment } from "@/lib/account";
import { db } from "@/lib/db";
import { comments, posts, type Account, type Post } from "@/lib/db/schema";
import type { InstagramClient } from "@/lib/instagram/client";
import type { IgComment, IgMedia } from "@/lib/instagram/types";

/** Instagram timestamps look like 2026-11-16T09:30:00+0000. */
export function parseIgTime(s: string): Date {
  return new Date(s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
}

function postValues(account: Account, m: IgMedia) {
  return {
    accountId: account.id,
    igMediaId: m.id,
    caption: m.caption ?? null,
    permalink: m.permalink ?? null,
    // Reels/videos have thumbnail_url; images only have media_url.
    thumbnailUrl: m.thumbnail_url ?? (m.media_type === "VIDEO" ? null : (m.media_url ?? null)),
    mediaType: m.media_type ?? null,
    mediaProductType: m.media_product_type ?? null,
    commentsCount: m.comments_count ?? null,
    postedAt: parseIgTime(m.timestamp),
  };
}

/** List all my media and upsert it. New posts get next_scan_at = null (scan ASAP). */
export async function syncMedia(client: InstagramClient, account: Account) {
  let seen = 0;
  let added = 0;
  for await (const m of client.listMedia()) {
    seen++;
    const v = postValues(account, m);
    const [row] = await db
      .insert(posts)
      .values(v)
      .onConflictDoUpdate({
        target: posts.igMediaId,
        set: {
          caption: v.caption,
          permalink: v.permalink,
          thumbnailUrl: v.thumbnailUrl,
          commentsCount: v.commentsCount,
          mediaType: v.mediaType,
          mediaProductType: v.mediaProductType,
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });
    if (row?.inserted) added++;
  }
  return { seen, added };
}

/**
 * Fetch every comment and reply on one post and store them.
 * Comments that disappeared from Instagram are marked `gone_at`.
 */
export async function scanPost(client: InstagramClient, account: Account, post: Pick<Post, "id" | "igMediaId">) {
  const fetched: IgComment[] = await client.listAllComments(post.igMediaId);
  const now = new Date();
  let inserted = 0;

  for (let i = 0; i < fetched.length; i += 200) {
    const chunk = fetched.slice(i, i + 200);
    const rows = chunk.map((c) => {
      const own = isOwnComment(c, account);
      return {
        igCommentId: c.id,
        postId: post.id,
        parentIgCommentId: c.parent_id ?? null,
        fromId: c.from?.id ?? null,
        username: c.from?.username ?? c.username ?? null,
        text: c.text ?? "",
        createdAt: parseIgTime(c.timestamp),
        likeCount: c.like_count ?? null,
        hidden: c.hidden ?? false,
        isOwn: own,
        // My own comments are decided immediately: kept, never scored or touched.
        status: own ? ("kept" as const) : ("new" as const),
        decidedBy: own ? ("auto" as const) : null,
        decidedAt: own ? now : null,
        firstSeenAt: now,
        lastSeenAt: now,
      };
    });
    const res = await db
      .insert(comments)
      .values(rows)
      .onConflictDoUpdate({
        target: comments.igCommentId,
        // Refresh what Instagram reports; keep score/status/decisions untouched.
        set: {
          text: sql`excluded.text`,
          hidden: sql`excluded.hidden`,
          likeCount: sql`excluded.like_count`,
          username: sql`coalesce(excluded.username, ${comments.username})`,
          fromId: sql`coalesce(excluded.from_id, ${comments.fromId})`,
          lastSeenAt: sql`excluded.last_seen_at`,
          goneAt: sql`null`,
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });
    inserted += res.filter((r) => r.inserted).length;
  }

  // Anything we had for this post that Instagram no longer returns is gone.
  const ids = fetched.map((c) => c.id);
  const goneWhere = and(eq(comments.postId, post.id), isNull(comments.goneAt), ids.length ? notInArray(comments.igCommentId, ids) : undefined);
  const gone = await db.update(comments).set({ goneAt: now }).where(goneWhere).returning({ id: comments.id });

  return { fetched: fetched.length, inserted, gone: gone.length };
}
