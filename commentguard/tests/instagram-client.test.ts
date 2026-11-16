import { describe, expect, it } from "vitest";
import { exchangeLoginCode, guessFlavor, InstagramClient } from "@/lib/instagram/client";
import { classify, InstagramApiError } from "@/lib/instagram/errors";
import { buildMockWorld, createMockFetch, MOCK_FB_TOKEN, MOCK_LOGIN_CODE, MOCK_TOKEN, type MockFetchOptions } from "@/lib/instagram/mock";

function client(opts: MockFetchOptions = {}, token = MOCK_TOKEN, world = buildMockWorld()) {
  return {
    world,
    ig: new InstagramClient({ accessToken: token, apiVersion: "v25.0", fetch: createMockFetch(world, { pageSize: 2, ...opts }), sleep: async () => {} }),
  };
}

const totalComments = (w: ReturnType<typeof buildMockWorld>, i: number) =>
  w.posts[i].comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

describe("InstagramClient (against the mock Graph API)", () => {
  it("reads the connected account", async () => {
    const { ig } = client();
    const me = await ig.me();
    expect(me.username).toBe("ranojoyghosh_");
    expect(me.user_id).toBeTruthy();
  });

  it("pages through all media, newest first", async () => {
    const { ig, world } = client();
    const media = [];
    for await (const m of ig.listMedia()) media.push(m);
    expect(media.map((m) => m.id)).toEqual([...world.posts].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((p) => p.id));
    expect(ig.calls).toBe(2); // 3 posts, page size 2
  });

  it("returns every comment and every reply, with parent ids", async () => {
    const { ig, world } = client();
    const all = await ig.listAllComments(world.posts[0].id);
    expect(all).toHaveLength(totalComments(world, 0));
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);

    // The comment with 7 replies needed the extra /replies pagination.
    const parent = world.posts[0].comments.find((c) => c.username === "arnab_99")!;
    expect(all.filter((c) => c.parent_id === parent.id)).toHaveLength(7);

    const spamReply = all.find((c) => c.username === "kaj_chai_2024" && c.parent_id);
    expect(spamReply?.parent_id).toBe(world.posts[0].comments[0].id);
    expect(all.filter((c) => !c.parent_id)).toHaveLength(world.posts[0].comments.length);
  });

  it("turns an invalid token into an auth error", async () => {
    const { ig } = client({}, "bad-token");
    await expect(ig.me()).rejects.toMatchObject({ kind: "auth", code: 190 });
  });

  it("retries transient errors, then succeeds", async () => {
    let failures = 2;
    const { ig } = client({
      intercept: () => (failures-- > 0 ? new Response(JSON.stringify({ error: { message: "oops", code: 2 } }), { status: 500 }) : undefined),
    });
    const me = await ig.me();
    expect(me.username).toBe("ranojoyghosh_");
    expect(ig.calls).toBe(3);
  });

  it("does not retry rate limits", async () => {
    const { ig } = client({
      intercept: () => new Response(JSON.stringify({ error: { message: "Application request limit reached", code: 4 } }), { status: 400 }),
    });
    const err = await ig.me().catch((e) => e);
    expect(err).toBeInstanceOf(InstagramApiError);
    expect(err.kind).toBe("rate_limit");
    expect(ig.calls).toBe(1);
  });

  it("refreshes the token at the unversioned endpoint", async () => {
    const seen: string[] = [];
    const { ig } = client({ intercept: (u) => (seen.push(u.pathname), undefined) });
    const r = await ig.refreshToken();
    expect(r.expires_in).toBeGreaterThan(0);
    expect(seen[0]).toBe("/refresh_access_token");
  });
});

describe("error classification", () => {
  it.each([
    [400, 4, undefined, "rate_limit"],
    [400, 17, undefined, "rate_limit"],
    [429, undefined, undefined, "rate_limit"],
    [400, 190, undefined, "auth"],
    [400, 100, 33, "not_found"],
    [500, undefined, undefined, "transient"],
    [400, 10, undefined, "permission"],
    [400, 200, undefined, "permission"],
    [400, 100, undefined, "other"],
  ] as const)("HTTP %s code %s/%s → %s", (status, code, sub, kind) => {
    expect(classify(status, code, sub)).toBe(kind);
  });
});

describe("Unified login (graph.facebook.com, system-user token)", () => {
  const fbClient = (igUserId?: string) => {
    const world = buildMockWorld();
    return {
      world,
      ig: new InstagramClient({ accessToken: MOCK_FB_TOKEN, flavor: "facebook", igUserId, apiVersion: "v25.0", fetch: createMockFetch(world, { pageSize: 2 }), sleep: async () => {} }),
    };
  };

  it("guesses the token type from its prefix", () => {
    expect(guessFlavor("EAAGm0PX4ZCps…")).toBe("facebook");
    expect(guessFlavor("IGAAJ…")).toBe("instagram");
  });

  it("uses graph.facebook.com by default", async () => {
    const seen: string[] = [];
    const world = buildMockWorld();
    const ig = new InstagramClient({ accessToken: MOCK_FB_TOKEN, flavor: "facebook", apiVersion: "v25.0", fetch: createMockFetch(world, { intercept: (u) => (seen.push(u.origin + u.pathname), undefined) }) });
    await ig.findInstagramAccounts();
    expect(seen[0]).toBe("https://graph.facebook.com/v25.0/me/assigned_instagram_accounts");
  });

  it("finds the assigned Instagram account and reads it by ID", async () => {
    const { ig, world } = fbClient();
    const accounts = await ig.findInstagramAccounts();
    expect(accounts).toEqual([{ id: world.me.user_id, username: "ranojoyghosh_" }]);
    ig.igUserId = accounts[0].id;
    const me = await ig.me();
    expect(me.user_id).toBe(world.me.user_id);
    expect(me.username).toBe("ranojoyghosh_");
  });

  it("needs the Instagram account ID before listing media", async () => {
    const { ig } = fbClient();
    await expect(ig.listMedia().next()).rejects.toThrow(/account ID/);
  });

  it("lists media and comments through /{ig-user-id}", async () => {
    const { ig, world } = fbClient(buildMockWorld().me.user_id);
    const media = [];
    for await (const m of ig.listMedia()) media.push(m);
    expect(media).toHaveLength(3);
    expect(await ig.listAllComments(world.posts[0].id)).toHaveLength(totalComments(world, 0));
  });

  it("reads expiry and permissions with debug_token", async () => {
    const { ig } = fbClient();
    const info = await ig.debugToken("app|secret");
    expect(info.type).toBe("SYSTEM_USER");
    expect(info.expires_at).toBe(0);
    expect(info.scopes).toContain("instagram_manage_comments");
  });

  it("exchanges the login code for a token", async () => {
    const fetch = createMockFetch(buildMockWorld());
    const opts = { redirectUri: "https://x.test/api/auth/meta/callback", appId: "app", appSecret: "secret", apiVersion: "v25.0", fetch };
    expect(await exchangeLoginCode({ ...opts, code: MOCK_LOGIN_CODE })).toBe(MOCK_FB_TOKEN);
    await expect(exchangeLoginCode({ ...opts, code: "used" })).rejects.toBeInstanceOf(InstagramApiError);
  });

  it("refuses to refresh a system-user token", async () => {
    const { ig } = fbClient();
    await expect(ig.refreshToken()).rejects.toThrow();
  });
});
