import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Thumb } from "@/components/thumb";
import { formatDate, timeAgo, timeUntil } from "@/lib/format";
import { listPosts } from "@/lib/queries";

export default async function PostsPage() {
  const rows = await listPosts();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Posts &amp; reels</h1>
        <p className="text-sm text-zinc-400">{rows.length} posts · newest are scanned most often</p>
      </header>
      {rows.length === 0 ? <Card className="text-sm text-zinc-400">No posts yet. Connect Instagram and tap “Scan now” on Home.</Card> : null}
      <ul className="space-y-3">
        {rows.map(({ p, stored, replies }) => (
          <li key={p.id}>
            <Card className="flex gap-3 p-3">
              <Link href={`/posts/${p.id}`} className="shrink-0">
                <Thumb url={p.thumbnailUrl} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/posts/${p.id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                  {p.caption || "(no caption)"}
                </Link>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge>{p.mediaProductType === "REELS" ? "Reel" : p.mediaType === "CAROUSEL_ALBUM" ? "Carousel" : "Post"}</Badge>
                  <Badge tone="info">
                    {stored} stored{p.commentsCount != null ? ` / ${p.commentsCount} on IG` : ""}
                  </Badge>
                  {replies ? <Badge>{replies} replies</Badge> : null}
                  {!p.monitored ? <Badge tone="warn">not monitored</Badge> : null}
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Posted {formatDate(p.postedAt)} · scanned {timeAgo(p.lastScannedAt)}
                  {p.nextScanAt ? ` · next ${timeUntil(p.nextScanAt)}` : " · waiting for first scan"}
                </p>
                {p.lastScanError ? <p className="mt-1 text-xs text-red-300">{p.lastScanError}</p> : null}
              </div>
              {p.permalink ? (
                <a href={p.permalink} target="_blank" rel="noreferrer" aria-label="Open on Instagram" className="grid size-9 shrink-0 place-items-center text-zinc-500 hover:text-zinc-200">
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
