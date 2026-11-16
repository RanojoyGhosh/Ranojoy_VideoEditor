import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Comment } from "@/lib/db/schema";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_TONE = {
  new: "neutral",
  kept: "brand",
  review: "warn",
  queued: "info",
  hidden: "info",
  deleted: "danger",
  failed: "danger",
} as const;

/** One comment or reply. Bengali text renders with Noto Sans Bengali (see layout). */
export function CommentItem({
  c,
  parent,
  post,
  compact,
}: {
  c: Comment;
  parent?: Pick<Comment, "username" | "text"> | null;
  post?: { id: number; caption: string | null } | null;
  compact?: boolean;
}) {
  const initial = (c.username ?? "?").replace(/^[^a-z0-9]+/i, "").charAt(0).toUpperCase() || "?";
  return (
    <article className={cn("flex gap-3", c.goneAt && "opacity-60")}>
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
          c.isOwn ? "bg-brand-500/20 text-brand-400" : "bg-zinc-800 text-zinc-300",
        )}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold">@{c.username ?? "unknown"}</span>
          <time className="text-xs text-zinc-500" dateTime={c.createdAt.toISOString()} title={formatDateTime(c.createdAt)}>
            {timeAgo(c.createdAt)}
          </time>
          {c.isOwn ? <Badge tone="brand">You · never touched</Badge> : null}
          {c.parentIgCommentId ? <Badge tone="info">Reply</Badge> : null}
          {c.hidden ? <Badge tone="warn">Hidden</Badge> : null}
          {c.goneAt ? <Badge tone="danger">Gone from Instagram</Badge> : null}
          {!c.isOwn && c.status !== "new" ? <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge> : null}
        </div>
        {parent ? (
          <p className="comment-text mt-1 line-clamp-2 border-l-2 border-zinc-700 pl-2 text-xs text-zinc-400">
            ↳ replying to @{parent.username}: {parent.text}
          </p>
        ) : null}
        <p className={cn("comment-text mt-1 text-[15px] text-zinc-100", compact && "line-clamp-4")}>{c.text || "—"}</p>
        {post ? (
          <Link href={`/posts/${post.id}`} className="mt-1 block truncate text-xs text-zinc-500 hover:text-zinc-300">
            on: {post.caption?.split("\n")[0] || "post"}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
