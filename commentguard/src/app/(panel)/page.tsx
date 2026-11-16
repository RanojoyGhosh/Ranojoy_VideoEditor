import { AlertTriangle, CircleDot, Plug } from "lucide-react";
import Link from "next/link";
import { CommentItem } from "@/components/comment-item";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { getAccount } from "@/lib/account";
import { formatDate, timeAgo } from "@/lib/format";
import { dashboardCounts, listComments } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { ScanNow } from "./scan-now";

// "Scan now" runs a tick inside this page's server action.
export const maxDuration = 60;

export default async function Dashboard() {
  const [account, s, counts, recent] = await Promise.all([
    getAccount(),
    getSettings(["tick.lastRunAt", "tick.lastSummary", "ig.cooldownUntil"]),
    dashboardCounts(),
    listComments({ limit: 15 }),
  ]);
  const lastRun = s["tick.lastRunAt"] ? Date.parse(s["tick.lastRunAt"]) : 0;
  const cooling = s["ig.cooldownUntil"] && Date.parse(s["ig.cooldownUntil"]) > Date.now();
  const watching = Date.now() - lastRun < 3 * 60_000;
  const daysLeft = account?.tokenExpiresAt ? Math.floor((account.tokenExpiresAt.getTime() - Date.now()) / 86_400_000) : null;

  const status = !account
    ? { label: "Not connected", tone: "warn" as const }
    : cooling
      ? { label: "Paused · rate limit", tone: "warn" as const }
      : watching
        ? { label: "Watching", tone: "brand" as const }
        : { label: "Idle · cron not running", tone: "warn" as const };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">CommentGuard</h1>
          <p className="text-sm text-zinc-400">{account ? `@${account.username}` : "No account connected"}</p>
        </div>
        <Badge tone={status.tone} className="px-3 py-1 text-xs">
          <CircleDot className="size-3" aria-hidden /> {status.label}
        </Badge>
      </header>

      {!account ? (
        <Card className="border-amber-500/30">
          <p className="text-sm text-zinc-300">Connect your Instagram account to start reading comments.</p>
          <Link href="/settings" className={cn(buttonVariants(), "mt-3 w-full")}>
            <Plug aria-hidden /> Connect Instagram
          </Link>
        </Card>
      ) : null}

      {account?.lastError ? (
        <Card className="flex gap-3 border-red-500/30">
          <AlertTriangle className="size-5 shrink-0 text-red-300" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-red-300">Instagram problem</p>
            <p className="text-zinc-300">{account.lastError}</p>
          </div>
        </Card>
      ) : null}
      {account && daysLeft !== null && daysLeft <= 7 ? (
        <Card className="border-amber-500/30 text-sm text-amber-200">
          Access token expires {formatDate(account.tokenExpiresAt)} ({daysLeft} days). Reconnect in Settings if it doesn&apos;t refresh.
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="flex items-baseline justify-between">
          <CardTitle>Last scan</CardTitle>
          <span className="text-xs text-zinc-500">{timeAgo(s["tick.lastRunAt"])}</span>
        </div>
        <p className="text-sm text-zinc-300">{s["tick.lastSummary"] ?? "No scan yet."}</p>
        <ScanNow />
        <p className="text-xs text-zinc-500">
          Step 1 is read-only: CommentGuard reads your comments but does not hide or delete anything yet.
        </p>
      </Card>

      <section aria-label="Today" className="grid grid-cols-2 gap-3">
        <Stat label="New today" value={counts.scannedToday} hint="comments seen today" />
        <Stat label="Comments" value={counts.total} hint={`${counts.replies} are replies`} />
        <Stat label="Posts" value={counts.posts} hint={`${counts.postsScanned} scanned`} />
        <Stat label="Yours" value={counts.own} hint="never touched" />
      </section>

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <CardTitle>Latest comments</CardTitle>
          <Link href="/comments" className="text-xs font-semibold text-brand-400">
            See all
          </Link>
        </div>
        {recent.length ? (
          <ul className="divide-y divide-zinc-800">
            {recent.map(({ c, parent, post }) => (
              <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                <CommentItem c={c} parent={parent} post={post} compact />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">Nothing yet. Tap “Scan now”.</p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card className="p-3.5">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value.toLocaleString("en-IN")}</p>
      <p className="text-[11px] text-zinc-500">{hint}</p>
    </Card>
  );
}
