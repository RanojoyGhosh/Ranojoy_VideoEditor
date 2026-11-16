/** Read queries for the panel pages. */
import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";
import { startOfTodayLocal } from "@/lib/format";

const parent = alias(comments, "parent");

export async function dashboardCounts() {
  const today = startOfTodayLocal();
  const [row] = await db
    .select({
      total: count(),
      replies: sql<number>`count(*) filter (where ${comments.parentIgCommentId} is not null)`.mapWith(Number),
      own: sql<number>`count(*) filter (where ${comments.isOwn})`.mapWith(Number),
      scannedToday: sql<number>`count(*) filter (where ${comments.firstSeenAt} >= ${today.toISOString()})`.mapWith(Number),
      postedToday: sql<number>`count(*) filter (where ${comments.createdAt} >= ${today.toISOString()})`.mapWith(Number),
    })
    .from(comments);
  const [p] = await db
    .select({ total: count(), scanned: sql<number>`count(*) filter (where ${posts.lastScannedAt} is not null)`.mapWith(Number) })
    .from(posts);
  return { ...row, posts: p.total, postsScanned: p.scanned };
}

export type CommentFilter = "all" | "replies" | "top" | "own" | "gone";

/** Comments newest first, with the parent comment (for replies) and the post. */
export async function listComments(opts: { filter?: CommentFilter; q?: string; postId?: number; limit?: number; offset?: number }) {
  const where: (SQL | undefined)[] = [];
  if (opts.filter === "replies") where.push(isNotNull(comments.parentIgCommentId));
  if (opts.filter === "top") where.push(isNull(comments.parentIgCommentId));
  if (opts.filter === "own") where.push(eq(comments.isOwn, true));
  if (opts.filter === "gone") where.push(isNotNull(comments.goneAt));
  if (opts.postId) where.push(eq(comments.postId, opts.postId));
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(or(ilike(comments.text, like), ilike(comments.username, like)));
  }
  const rows = await db
    .select({ c: comments, parentUsername: parent.username, parentText: parent.text, postCaption: posts.caption })
    .from(comments)
    .leftJoin(parent, eq(parent.igCommentId, comments.parentIgCommentId))
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(and(...where))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  return rows.map((r) => ({
    c: r.c,
    parent: r.c.parentIgCommentId ? { username: r.parentUsername, text: r.parentText ?? "(not stored)" } : null,
    post: { id: r.c.postId, caption: r.postCaption },
  }));
}

export async function listPosts() {
  return db
    .select({
      p: posts,
      stored: sql<number>`(select count(*) from ${comments} where ${comments.postId} = ${posts.id})`.mapWith(Number),
      replies: sql<number>`(select count(*) from ${comments} where ${comments.postId} = ${posts.id} and ${comments.parentIgCommentId} is not null)`.mapWith(Number),
    })
    .from(posts)
    .orderBy(desc(posts.postedAt));
}

export async function getPost(id: number) {
  const [p] = await db.select().from(posts).where(eq(posts.id, id));
  return p ?? null;
}

/** Top-level comments (newest first), each with its replies (oldest first). */
export async function postThreads(postId: number) {
  const all = await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(comments.createdAt);
  const tops = all.filter((c) => !c.parentIgCommentId).reverse();
  const byParent = new Map<string, typeof all>();
  for (const c of all) {
    if (!c.parentIgCommentId) continue;
    byParent.set(c.parentIgCommentId, [...(byParent.get(c.parentIgCommentId) ?? []), c]);
  }
  const orphans = all.filter((c) => c.parentIgCommentId && !tops.some((t) => t.igCommentId === c.parentIgCommentId));
  return { threads: tops.map((t) => ({ top: t, replies: byParent.get(t.igCommentId) ?? [] })), orphans };
}
