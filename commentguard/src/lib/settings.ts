/**
 * App settings stored in the `settings` table, with typed defaults.
 * Only keys that differ from the defaults need a row.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export const DEFAULT_SETTINGS = {
  /** Newest N posts scanned most often (catches spam on a reel going viral). */
  "scan.hotPosts": 5,
  "scan.hotIntervalMin": 2,
  /** Next tier: the most recent N posts. */
  "scan.recentPosts": 30,
  "scan.recentIntervalMin": 10,
  /** Everything older. */
  "scan.olderIntervalMin": 1440,
  /** How often to re-list my media to discover new posts. */
  "scan.mediaSyncIntervalMin": 10,
  /** "all" = every post; "recent" = only the newest `scan.monitorRecentN`. */
  "scan.monitor": "all" as "all" | "recent",
  "scan.monitorRecentN": 50,
  /** Pause scanning after a rate-limit error until this ISO time. */
  "ig.cooldownUntil": null as string | null,
  "ig.lastMediaSyncAt": null as string | null,
  "tick.lastRunAt": null as string | null,
  "tick.lastSummary": null as string | null,
  /** Login throttling: 5 wrong passwords → locked for 15 minutes. */
  "auth.failCount": 0,
  "auth.lockedUntil": null as string | null,
};

export type SettingsShape = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof SettingsShape;

export async function getSettings<K extends SettingKey>(keys: K[]): Promise<Pick<SettingsShape, K>> {
  const rows = keys.length ? await db.select().from(settings).where(inArray(settings.key, keys)) : [];
  const out = {} as Pick<SettingsShape, K>;
  for (const k of keys) {
    const row = rows.find((r) => r.key === k);
    out[k] = (row ? row.value : DEFAULT_SETTINGS[k]) as SettingsShape[K];
  }
  return out;
}

export async function getAllSettings(): Promise<SettingsShape> {
  return getSettings(Object.keys(DEFAULT_SETTINGS) as SettingKey[]) as Promise<SettingsShape>;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsShape[K]> {
  return (await getSettings([key]))[key];
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingsShape[K]) {
  if (value === null || value === undefined) {
    // No row = the default; every nullable setting defaults to null.
    await db.delete(settings).where(eq(settings.key, key));
    return;
  }
  await db
    .insert(settings)
    .values({ key, value: value as unknown })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as unknown, updatedAt: sql`now()` } });
}

/**
 * A simple lease lock stored in `settings`, so two cron ticks never overlap.
 * (Session advisory locks don't work through Supabase's transaction pooler.)
 */
export async function tryAcquireLease(name: string, seconds: number): Promise<boolean> {
  const key = `lease.${name}`;
  const until = new Date(Date.now() + seconds * 1000).toISOString();
  const rows = await db.execute(sql`
    insert into settings (key, value, updated_at)
    values (${key}, ${JSON.stringify({ until })}::jsonb, now())
    on conflict (key) do update
      set value = excluded.value, updated_at = now()
      where (settings.value->>'until')::timestamptz < now()
    returning key`);
  return rows.length > 0;
}

export async function releaseLease(name: string) {
  await db.execute(sql`delete from settings where key = ${`lease.${name}`}`);
}
