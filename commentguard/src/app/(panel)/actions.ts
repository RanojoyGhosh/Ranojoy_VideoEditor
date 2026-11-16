"use server";

import { revalidatePath } from "next/cache";
import { connectWithToken } from "@/lib/account";
import { requireAdmin } from "@/lib/auth/session";
import { InstagramApiError } from "@/lib/instagram/errors";
import { setSetting, type SettingKey } from "@/lib/settings";
import { runTick } from "@/lib/tick";

export type ActionState = { ok?: string; error?: string };

/** "Scan now": runs one tick right away (same as the cron does every minute). */
export async function scanNowAction(_prev: ActionState): Promise<ActionState> {
  await requireAdmin();
  try {
    const r = await runTick({ budgetMs: 40_000 });
    revalidatePath("/", "layout");
    if (r.skipped === "no_account") return { error: "Connect your Instagram account in Settings first." };
    return r.ok ? { ok: r.summary } : { error: r.summary };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/** Settings → paste a new long-lived token (first connect or reconnect). */
export async function connectAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const account = await connectWithToken(String(form.get("token") ?? ""));
    revalidatePath("/", "layout");
    return { ok: `Connected @${account.username}. Tap "Scan now" on Home to start reading comments.` };
  } catch (err) {
    if (err instanceof InstagramApiError && err.kind === "auth") {
      return { error: "Instagram rejected this token. Generate a new one in the Meta dashboard and paste it again." };
    }
    return { error: (err as Error).message };
  }
}

const SCAN_FIELDS: { key: SettingKey; min: number; max: number }[] = [
  { key: "scan.hotPosts", min: 0, max: 50 },
  { key: "scan.hotIntervalMin", min: 1, max: 60 },
  { key: "scan.recentPosts", min: 0, max: 200 },
  { key: "scan.recentIntervalMin", min: 2, max: 240 },
  { key: "scan.olderIntervalMin", min: 60, max: 10080 },
  { key: "scan.mediaSyncIntervalMin", min: 2, max: 1440 },
  { key: "scan.monitorRecentN", min: 1, max: 10000 },
];

export async function saveScanSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const values: [SettingKey, number][] = [];
  for (const f of SCAN_FIELDS) {
    const n = Number(form.get(f.key));
    if (!Number.isInteger(n) || n < f.min || n > f.max) {
      return { error: `"${f.key}" must be a whole number from ${f.min} to ${f.max}.` };
    }
    values.push([f.key, n]);
  }
  const monitor = form.get("scan.monitor") === "recent" ? "recent" : "all";
  for (const [k, v] of values) await setSetting(k as "scan.hotPosts", v);
  await setSetting("scan.monitor", monitor);
  revalidatePath("/settings");
  return { ok: "Saved. New intervals apply after each post's next scan." };
}
