/**
 * End-to-end ingestion against a real Postgres (TEST_DATABASE_URL) and the mock Graph API.
 */
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { clientFor, connectWithToken, getAccount, getAccessToken, maybeRefreshToken } from "@/lib/account";
import { db } from "@/lib/db";
import { accounts, comments, posts } from "@/lib/db/schema";
import { InstagramClient } from "@/lib/instagram/client";
import { buildMockWorld, createMockFetch, MOCK_FB_TOKEN, MOCK_TOKEN, sharedMockWorld, type MockFetchOptions } from "@/lib/instagram/mock";
import { runIngestion } from "@/lib/ingestion/scheduler";
import { getSetting, setSetting, tryAcquireLease } from "@/lib/settings";
import { runTick } from "@/lib/tick";
import { hasDb, resetDb } from "./db-helpers";

const FAR = Date.now() + 3_600_000;

function igFor(opts: MockFetchOptions = {}) {
  return new InstagramClient({ accessToken: MOCK_TOKEN, fetch: createMockFetch(sharedMockWorld(), opts), sleep: async () => {} });
}
const worldTotal = () => sharedMockWorld().posts.reduce((n, p) => n + p.comments.reduce((m, c) => m + 1 + (c.replies?.length ?? 0), 0), 0);
const count = async (where?: ReturnType<typeof eq>) => (await db.select({ n: sql<number>`count(*)::int` }).from(comments).where(where))[0].n;
const makeAllDue = () => db.update(posts).set({ nextScanAt: null });

describe.skipIf(!hasDb)("ingestion", () => {
  beforeEach(async () => {
    await resetDb();
    globalThis.__cgMockWorld = buildMockWorld();
  });

  it("connects with a token and stores it encrypted", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    expect(acc.username).toBe("ranojoyghosh_");
    expect(acc.accessTokenEnc).not.toContain(MOCK_TOKEN);
    expect(getAccessToken(acc)).toBe(MOCK_TOKEN);
    expect(acc.tokenExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 50 * 86_400_000);
  });

  it("connects a Unified login system-user token (never expires, no refresh)", async () => {
    const acc = await connectWithToken(MOCK_FB_TOKEN);
    expect(acc.apiFlavor).toBe("facebook");
    expect(acc.igUserId).toBe(sharedMockWorld().me.user_id);
    expect(acc.username).toBe("ranojoyghosh_");
    expect(acc.tokenExpiresAt).toBeNull();
    expect(acc.tokenExpiryEstimated).toBe(false);
    expect(acc.tokenScopes).toContain("instagram_manage_comments");
    expect(await maybeRefreshToken(acc)).toBeNull();

    const r = await runIngestion({ client: clientFor(acc), account: acc, deadline: FAR });
    expect(r.errors).toEqual([]);
    expect(r.commentsNew).toBe(worldTotal());
    // My own comments are recognised by the Instagram account ID here too.
    expect(await count(eq(comments.isOwn, true))).toBe(2);
  });

  it("rejects a bad token without saving anything", async () => {
    await expect(connectWithToken("nope")).rejects.toThrow(/access token/i);
    expect(await getAccount()).toBeNull();
  });

  it("backfills every post, comment and reply, and marks my own comments", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    const r = await runIngestion({ client: igFor(), account: acc, deadline: FAR });

    expect(r.errors).toEqual([]);
    expect(r.mediaSynced).toBe(true);
    expect(r.postsScanned).toBe(3);
    expect(r.commentsNew).toBe(worldTotal());
    expect(await count()).toBe(worldTotal());

    const own = await db.select().from(comments).where(eq(comments.isOwn, true));
    expect(own).toHaveLength(2);
    expect(own.every((c) => c.status === "kept" && c.decidedBy === "auto")).toBe(true);
    expect(await count(eq(comments.status, "new"))).toBe(worldTotal() - 2);

    const reply = (await db.select().from(comments).where(eq(comments.username, "earning_queen_7")))[0];
    expect(reply.parentIgCommentId).toBeTruthy();
    expect(reply.text).toContain("৯৮৭৬৫৪৩২১০");
  });

  it("only scans posts that are due, newest tier soonest", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    const again = await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    expect(again.postsScanned).toBe(0);
    expect(again.mediaSynced).toBe(false);

    const rows = await db.select().from(posts).orderBy(sql`posted_at desc`);
    const gap = (p: (typeof rows)[number]) => p.nextScanAt!.getTime() - p.lastScannedAt!.getTime();
    expect(gap(rows[0])).toBe(2 * 60_000); // hot tier
    expect(gap(rows[1])).toBe(2 * 60_000);
    // With 30 recent posts configured, all 3 are within "hot" (5); shrink tiers to check the others.
    await setSetting("scan.hotPosts", 1);
    await setSetting("scan.recentPosts", 2);
    await makeAllDue();
    await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    const rows2 = await db.select().from(posts).orderBy(sql`posted_at desc`);
    expect(rows2.map(gap)).toEqual([2, 10, 1440].map((m) => m * 60_000));
  });

  it("de-duplicates and never overwrites a decision", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    await db.update(comments).set({ status: "review", score: 70 }).where(eq(comments.username, "job_offer_kolkata"));

    await makeAllDue();
    const r = await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    expect(r.commentsNew).toBe(0);
    expect(await count()).toBe(worldTotal());
    const [c] = await db.select().from(comments).where(eq(comments.username, "job_offer_kolkata"));
    expect(c.status).toBe("review");
    expect(c.score).toBe(70);
  });

  it("picks up new comments and marks deleted ones as gone", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    const viral = sharedMockWorld().posts[0];
    const removed = viral.comments.splice(viral.comments.findIndex((c) => c.username === "tanmoy_"), 1)[0];
    viral.comments[0].replies!.push({ id: "17999999999999999", text: "Telegram e join koro", timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "+0000"), username: "tg_jobs", from: { id: "555", username: "tg_jobs" } });

    await makeAllDue();
    const r = await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    expect(r.commentsNew).toBe(1);
    expect(r.commentsGone).toBe(1);
    const [gone] = await db.select().from(comments).where(eq(comments.igCommentId, removed.id));
    expect(gone.goneAt).not.toBeNull();
    expect(await count(and(isNull(comments.goneAt), eq(comments.username, "tg_jobs")) as never)).toBe(1);
  });

  it("stops at the deadline and leaves the rest for the next tick", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    let t = Date.now();
    const r = await runIngestion({ client: igFor(), account: acc, deadline: t + 1, now: () => t++ });
    expect(r.stoppedBy).toBe("deadline");
    expect(r.postsDueLeft).toBeGreaterThan(0);
    const next = await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    expect(next.postsScanned).toBe(r.postsDueLeft);
  });

  it("pauses everything for 15 minutes after a rate limit", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    const limited = igFor({
      intercept: (u) =>
        u.pathname.endsWith("/comments") ? new Response(JSON.stringify({ error: { message: "limit", code: 4 } }), { status: 400 }) : undefined,
    });
    const r = await runIngestion({ client: limited, account: acc, deadline: FAR });
    expect(r.stoppedBy).toBe("rate_limit");
    expect(r.postsScanned).toBe(0);
    const until = await getSetting("ig.cooldownUntil");
    expect(Date.parse(until!)).toBeGreaterThan(Date.now() + 14 * 60_000);

    const during = await runIngestion({ client: igFor(), account: acc, deadline: FAR });
    expect(during.stoppedBy).toBe("cooldown");
    expect(await count()).toBe(0);
  });

  it("records a rejected token on the account", async () => {
    const acc = await connectWithToken(MOCK_TOKEN);
    const broken = new InstagramClient({ accessToken: "expired", fetch: createMockFetch(sharedMockWorld()), sleep: async () => {} });
    const r = await runIngestion({ client: broken, account: acc, deadline: FAR });
    expect(r.stoppedBy).toBe("auth");
    expect((await getAccount())!.lastError).toMatch(/Reconnect/);
  });

  it("refreshes the token once it is old enough", async () => {
    let acc = await connectWithToken(MOCK_TOKEN);
    // connectWithToken already refreshed (mock tokens are always old enough).
    expect(acc.tokenExpiryEstimated).toBe(false);
    expect(await maybeRefreshToken(acc)).toBeNull();

    await db.update(accounts).set({ tokenRefreshedAt: new Date(Date.now() - 8 * 86_400_000) });
    acc = (await getAccount())!;
    expect(await maybeRefreshToken(acc)).toBe("token refreshed");
    expect((await getAccount())!.tokenRefreshedAt!.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it("tick: connects from IG_ACCESS_TOKEN, scans, and never overlaps", async () => {
    process.env.IG_ACCESS_TOKEN = MOCK_TOKEN;
    try {
      const r = await runTick({ budgetMs: 30_000 });
      expect(r.skipped).toBeUndefined();
      expect(r.ingestion!.commentsNew).toBe(worldTotal());
      expect(await getSetting("tick.lastSummary")).toMatch(/3 posts scanned/);

      expect(await tryAcquireLease("tick", 60)).toBe(true);
      expect((await runTick()).skipped).toBe("locked");
    } finally {
      delete process.env.IG_ACCESS_TOKEN;
    }
  });

  it("tick without any account says so", async () => {
    const r = await runTick();
    expect(r.skipped).toBe("no_account");
    expect(await db.select().from(comments).where(isNotNull(comments.id))).toHaveLength(0);
  });
});

describe.skipIf(!hasDb)("settings", () => {
  beforeEach(resetDb);

  it("stores values and falls back to defaults, including null", async () => {
    expect(await getSetting("scan.hotPosts")).toBe(5);
    await setSetting("scan.hotPosts", 8);
    expect(await getSetting("scan.hotPosts")).toBe(8);
    await setSetting("auth.lockedUntil", "2030-01-01T00:00:00.000Z");
    await setSetting("auth.lockedUntil", null);
    expect(await getSetting("auth.lockedUntil")).toBeNull();
  });
});
