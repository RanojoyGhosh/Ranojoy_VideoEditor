import { Search } from "lucide-react";
import Link from "next/link";
import { CommentItem } from "@/components/comment-item";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listComments, type CommentFilter } from "@/lib/queries";
import { cn } from "@/lib/utils";

const PAGE = 50;
const FILTERS: { key: CommentFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "replies", label: "Replies" },
  { key: "top", label: "Top-level" },
  { key: "own", label: "Mine" },
  { key: "gone", label: "Gone" },
];

export default async function CommentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.key === sp.filter)?.key ?? "all") as CommentFilter;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await listComments({ filter, q, limit: PAGE + 1, offset: (page - 1) * PAGE });
  const hasMore = rows.length > PAGE;
  const href = (o: { filter?: string; page?: number }) => {
    const u = new URLSearchParams();
    const f = o.filter ?? filter;
    if (f !== "all") u.set("filter", f);
    if (q) u.set("q", q);
    if (o.page && o.page > 1) u.set("page", String(o.page));
    const s = u.toString();
    return s ? `/comments?${s}` : "/comments";
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Comments</h1>
        <p className="text-sm text-zinc-400">Every comment and reply on your posts, newest first.</p>
      </header>

      <form className="relative" action="/comments">
        {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <Input name="q" defaultValue={q} placeholder="Search text or username" className="pl-9" aria-label="Search comments" />
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href({ filter: f.key, page: 1 })}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm",
              f.key === filter ? "border-brand-500 bg-brand-500/15 text-brand-400" : "border-zinc-700 text-zinc-300",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? <Card className="text-sm text-zinc-400">No comments match.</Card> : null}
      <ul className="space-y-3">
        {rows.slice(0, PAGE).map(({ c, parent, post }) => (
          <li key={c.id}>
            <Card className="p-3.5">
              <CommentItem c={c} parent={parent} post={post} />
            </Card>
          </li>
        ))}
      </ul>

      <div className="flex justify-between">
        {page > 1 ? (
          <Link href={href({ page: page - 1 })} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-400">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        {hasMore ? (
          <Link href={href({ page: page + 1 })} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-400">
            Older →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
