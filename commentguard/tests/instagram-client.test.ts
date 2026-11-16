import { describe, expect, it } from "vitest";
import { InstagramClient } from "@/lib/instagram/client";
import { classify, InstagramApiError } from "@/lib/instagram/errors";
import { buildMockWorld, createMockFetch, MOCK_TOKEN, type MockFetchOptions } from "@/lib/instagram/mock";

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
