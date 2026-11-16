/**
 * One "tick" of the bot, called every minute by cron (and by "Scan now").
 * Step 1: connect from .env if needed → refresh token if due → scan due posts.
 * Later steps add: detection, the delayed hide/delete worker, notifications.
 */
import { clientFor, ensureAccount, maybeRefreshToken } from "@/lib/account";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { runIngestion, type IngestionResult } from "@/lib/ingestion/scheduler";
import { releaseLease, setSetting, tryAcquireLease } from "@/lib/settings";

export interface TickResult {
  ok: boolean;
  skipped?: "locked" | "no_account";
  token?: string | null;
  ingestion?: IngestionResult;
  summary: string;
  ms: number;
}

export function summarize(i: IngestionResult): string {
  const parts = [
    `${i.postsScanned} post${i.postsScanned === 1 ? "" : "s"} scanned`,
    `${i.commentsNew} new comment${i.commentsNew === 1 ? "" : "s"}`,
  ];
  if (i.postsAdded) parts.push(`${i.postsAdded} new post${i.postsAdded === 1 ? "" : "s"}`);
  if (i.commentsGone) parts.push(`${i.commentsGone} gone`);
  if (i.postsDueLeft) parts.push(`${i.postsDueLeft} posts left for next tick`);
  if (i.stoppedBy === "cooldown") parts.unshift("Paused after a rate limit");
  if (i.stoppedBy === "rate_limit") parts.push("hit a rate limit, pausing 15 min");
  if (i.stoppedBy === "auth") parts.push("token rejected, reconnect needed");
  if (i.errors.length) parts.push(`${i.errors.length} error${i.errors.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export async function runTick(opts: { budgetMs?: number } = {}): Promise<TickResult> {
  const started = Date.now();
  const budget = opts.budgetMs ?? 45_000;

  // Lease a bit longer than the budget so a crashed tick frees itself.
  if (!(await tryAcquireLease("tick", Math.ceil(budget / 1000) + 30))) {
    return { ok: true, skipped: "locked", summary: "Another scan is already running", ms: 0 };
  }
  try {
    const account = await ensureAccount();
    if (!account) {
      return { ok: true, skipped: "no_account", summary: "No Instagram account connected yet", ms: Date.now() - started };
    }
    const token = await maybeRefreshToken(account);
    // Re-read in case the token was refreshed.
    const fresh = token ? ((await ensureAccount()) ?? account) : account;
    const ingestion = await runIngestion({ client: clientFor(fresh), account: fresh, deadline: started + budget });
    const summary = summarize(ingestion) + (token ? ` · ${token}` : "");

    await setSetting("tick.lastRunAt", new Date().toISOString());
    await setSetting("tick.lastSummary", summary);
    if (ingestion.errors.length || ingestion.stoppedBy === "rate_limit" || ingestion.stoppedBy === "auth") {
      await db.insert(auditLog).values({ action: "scan_problem", detail: [summary, ...ingestion.errors].join("\n").slice(0, 4000) });
    }
    return { ok: !ingestion.errors.length, token, ingestion, summary, ms: Date.now() - started };
  } finally {
    await releaseLease("tick");
  }
}
