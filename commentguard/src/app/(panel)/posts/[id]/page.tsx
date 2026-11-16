import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentItem } from "@/components/comment-item";
import { Card } from "@/components/ui/card";
import { formatDateTime, timeAgo } from "@/lib/format";
import { getPost, postThreads } from "@/lib/queries";
import { Thumb } from "@/components/thumb";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const post = await getPost(id);
  if (!post) notFound();
  const { threads, orphans } = await postThreads(id);
  const total = threads.reduce((n, t) => n + 1 + t.replies.length, 0) + orphans.length;

  return (
    <div className="space-y-4">
      <Link href="/posts" className="inline-flex min-h-11 items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200">
        <ArrowLeft className="size-4" aria-hidden /> Posts
      </Link>
      <Card className="flex gap-3 p-3">
        <Thumb url={post.thumbnailUrl} className="h-28 w-20" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="comment-text line-clamp-4">{post.caption || "(no caption)"}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Posted {formatDateTime(post.postedAt)} · {total} comments stored · scanned {timeAgo(post.lastScannedAt)}
          </p>
          {post.permalink ? (
            <a href={post.permalink} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-brand-400">
              Open on Instagram <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </Card>

      {threads.length === 0 && orphans.length === 0 ? <Card className="text-sm text-zinc-400">No comments stored for this post yet.</Card> : null}

      <ul className="space-y-3">
        {threads.map(({ top, replies }) => (
          <li key={top.id}>
            <Card className="space-y-3 p-3.5">
              <CommentItem c={top} />
              {replies.length ? (
                <ul className="ml-4 space-y-3 border-l border-zinc-800 pl-3">
                  {replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem c={r} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </li>
        ))}
        {orphans.map((r) => (
          <li key={r.id}>
            <Card className="p-3.5">
              <CommentItem c={r} parent={{ username: "?", text: "(parent comment not stored)" }} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
