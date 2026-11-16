/**
 * Polling scheduler. Each cron tick scans the posts that are due, newest first,
 * until the time budget runs out. Backfill is the same loop: a post never
 * scanned is due right away, so the first ticks after connecting walk through
 * every post and every comment.
 *
 * Tiers (all configurable in settings):
 *   newest `hotPosts`     → every `hotIntervalMin` minutes (viral spikes)
 *   newest `recentPosts`  → every `recentIntervalMin` minutes
 *   everything older      → every `olderIntervalMin` minutes (daily)
 */
import { desc, eq } from "drizzle-orm";
import { recordAccountError } from "@/lib/account";
import { db } from "@/lib/db";
import { posts, type Account } from "@/lib/db/schema";
import { InstagramApiError } from "@/lib/instagram/errors";
import type { InstagramClient } from "@/lib/instagram/client";
import { getAllSettings, setSetting, type SettingsShape } from "@/lib/settings";
import { scanPost, syncMedia } from "./sync";

const MIN = 60_000;
const RATE_LIMIT_COOLDOWN_MS = 15 * MIN;

export function intervalForRank(rank: number, s: SettingsShape): number {
  if (rank < s["scan.hotPosts"]) return s["scan.hotIntervalMin"];
  if (rank < s["scan.recentPosts"]) return s["scan.recentIntervalMin"];
  return s["scan.olderIntervalMin"];
}

export interface IngestionResult {
  mediaSynced: boolean;
  postsAdded: number;
  postsScanned: number;
  postsDueLeft: number;
  commentsFetched: number;
  commentsNew: number;
  commentsGone: number;
  apiCalls: number;
  stoppedBy?: "cooldown" | "rate_limit" | "auth" | "deadline";
  errors: string[];
}

export async function runIngestion(opts: {
  client: InstagramClient;
  account: Account;
  /** Stop starting new post scans after this time (epoch ms). */
  deadline: number;
  now?: () => number;
}): Promise<IngestionResult> {
  const now = opts.now ?? Date.now;
  const { client, account } = opts;
  const s = await getAllSettings();
  const r: IngestionResult = {
    mediaSynced: false,
    postsAdded: 0,
    postsScanned: 0,
    postsDueLeft: 0,
    commentsFetched: 0,
    commentsNew: 0,
    commentsGone: 0,
    apiCalls: 0,
    errors: [],
  };

  if (s["ig.cooldownUntil"] && Date.parse(s["ig.cooldownUntil"]) > now()) {
    r.stoppedBy = "cooldown";
    return r;
  }

  /** Returns true if the whole run must stop. */
  const handle = async (err: unknown, where: string): Promise<boolean> => {
    if (err instanceof InstagramApiError) {
      r.errors.push(`${where}: ${err.summary}`);
      if (err.kind === "rate_limit") {
        await setSetting("ig.cooldownUntil", new Date(now() + RATE_LIMIT_COOLDOWN_MS).toISOString());
        r.stoppedBy = "rate_limit";
        return true;
      }
      if (err.kind === "auth") {
        await recordAccountError(account, `Instagram rejected the token: ${err.message}. Reconnect in Settings.`);
        r.stoppedBy = "auth";
        return true;
      }
      return false;
    }
    r.errors.push(`${where}: ${(err as Error).message}`);
    return false;
  };

  try {
    // 1. Discover new posts.
    const lastSync = s["ig.lastMediaSyncAt"] ? Date.parse(s["ig.lastMediaSyncAt"]) : 0;
    if (now() - lastSync >= s["scan.mediaSyncIntervalMin"] * MIN) {
      try {
        const m = await syncMedia(client, account);
        r.mediaSynced = true;
        r.postsAdded = m.added;
        await setSetting("ig.lastMediaSyncAt", new Date(now()).toISOString());
      } catch (err) {
        if (await handle(err, "listing posts")) return r;
      }
    }

    // 2. Rank posts newest-first and scan the due ones.
    const all = await db
      .select({ id: posts.id, igMediaId: posts.igMediaId, nextScanAt: posts.nextScanAt, monitored: posts.monitored })
      .from(posts)
      .where(eq(posts.accountId, account.id))
      .orderBy(desc(posts.postedAt));
    const limit = s["scan.monitor"] === "recent" ? s["scan.monitorRecentN"] : Infinity;
    const eligible = all.map((p, rank) => ({ ...p, rank })).filter((p) => p.monitored && p.rank < limit);
    const due = eligible.filter((p) => !p.nextScanAt || p.nextScanAt.getTime() <= now());

    for (let i = 0; i < due.length; i++) {
      const p = due[i];
      if (now() >= opts.deadline) {
        r.stoppedBy = "deadline";
        r.postsDueLeft = due.length - i;
        break;
      }
      try {
        const res = await scanPost(client, account, p);
        r.postsScanned++;
        r.commentsFetched += res.fetched;
        r.commentsNew += res.inserted;
        r.commentsGone += res.gone;
        const t = now();
        await db
          .update(posts)
          .set({ lastScannedAt: new Date(t), nextScanAt: new Date(t + intervalForRank(p.rank, s) * MIN), lastScanError: null })
          .where(eq(posts.id, p.id));
      } catch (err) {
        const stop = await handle(err, `post ${p.igMediaId}`);
        const notFound = err instanceof InstagramApiError && err.kind === "not_found";
        await db
          .update(posts)
          .set({
            lastScanError: notFound ? "Post no longer exists on Instagram" : (err as Error).message.slice(0, 500),
            // Retry a failing post in 10 minutes; a deleted post only once a day.
            nextScanAt: new Date(now() + (notFound ? 1440 : 10) * MIN),
          })
          .where(eq(posts.id, p.id));
        if (stop) break;
      }
    }
  } finally {
    r.apiCalls = client.calls;
  }
  return r;
}
