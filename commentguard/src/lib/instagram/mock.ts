/**
 * A fake graph.instagram.com, used when IG_MOCK=true and in tests.
 * It answers the same URLs the real client calls, with small pages so the
 * pagination code is exercised. Data = the spec's test cases plus genuine leads.
 */
import type { FetchLike } from "./client";
import type { IgComment, IgMedia, IgMe } from "./types";

export const MOCK_TOKEN = "mock-token";

interface MockComment extends Omit<IgComment, "replies"> {
  replies?: MockComment[];
}
interface MockPost extends IgMedia {
  comments: MockComment[];
}
export interface MockWorld {
  me: IgMe;
  posts: MockPost[];
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, "+0000");

let seq = 1000;
function c(username: string, text: string, minutesAgo: number, replies: MockComment[] = [], fromId?: string): MockComment {
  const id = `1780000000000${String(seq++).padStart(4, "0")}`;
  return { id, text, username, timestamp: ago(minutesAgo), from: { id: fromId ?? `9${seq}0${username.length}`, username }, like_count: 0, hidden: false, replies };
}

/** Build a fresh fake account. Pass `ownId`/`ownName` to tweak who "I" am. */
export function buildMockWorld(): MockWorld {
  seq = 1000;
  const me: IgMe = {
    id: "26000000000000001",
    user_id: "17841400000000001",
    username: "ranojoyghosh_",
    account_type: "MEDIA_CREATOR",
    name: "Ranojoy Ghosh",
    media_count: 3,
  };
  const mine = (text: string, minutesAgo: number) => c(me.username, text, minutesAgo, [], me.user_id);

  const manyReplies = Array.from({ length: 7 }, (_, i) => c(`lead_${i + 1}`, i % 2 ? "Interested" : "Amio janbo dada", 30 - i));

  const viral: MockPost = {
    id: "18000000000000101",
    caption: "Freelancing শুরু করতে চাও? Comment করো \"Freelancing\" আমি DM করবো 🔥",
    media_type: "VIDEO",
    media_product_type: "REELS",
    permalink: "https://www.instagram.com/reel/MOCK101/",
    thumbnail_url: "https://picsum.photos/seed/cg101/300/400",
    timestamp: ago(180),
    comments_count: 0,
    comments: [
      c("riya_das22", "Freelancing", 170, [
        c("kaj_chai_2024", "ডিটেইলস জানার জন্য \"98765 43210\" - এই নাম্বার এ হোয়াটসঅ্যাপে মেসেজ করুন", 160),
        mine("Check your DM 🙌", 150),
      ]),
      c("sourav.m", "Kivabe", 140, [
        c("priya_work_home99", "আমি তোমায় নিজে কাজ শিখিয়ে দেবো পুরো গাইড এর সাথে, কাজের জন্য details জানতে inbox করো", 135),
      ]),
      c("ankita_b", "কিভাবে শুরু করবো?", 120, [
        c("earning_queen_7", "কাজের জন্য ৯৮৭৬৫৪৩২১০ নম্বরে message করুন, No charges free of cost", 118),
      ]),
      c("rahul_k", "Dada details den", 100, [
        c("part_time_income.01", "ghore bose income korte chaile WhatsApp koro 9 8 76543210", 99),
      ]),
      c("job_offer_kolkata", "Office e kaj, chele meye chai, DM koro", 90),
      c("tanmoy_", "Price koto?", 80),
      c("mou_sen", "👏❤️❤️", 70),
      c("dipika.r", "Kaj ta ki free?", 60),
      c("arnab_99", "Interested", 50, manyReplies),
      c("kaj_chai_2024", "ডিটেইলস জানার জন্য \"98xxx xxxxx\" - এই নাম্বার এ হোয়াটসঅ্যাপে মেসেজ করুন", 40),
      mine("Comment \"Freelancing\" and I'll DM you. WhatsApp details link in bio 👆", 175),
    ],
  };
  const older: MockPost = {
    id: "18000000000000102",
    caption: "College + freelancing routine 📚",
    media_type: "VIDEO",
    media_product_type: "REELS",
    permalink: "https://www.instagram.com/reel/MOCK102/",
    thumbnail_url: "https://picsum.photos/seed/cg102/300/400",
    timestamp: ago(60 * 24 * 3),
    comments: [
      c("sneha.p", "Kivabe start korbo dada?", 60 * 24 * 2, [c("work_from_home_jobs1", "ঘরে বসে ইনকাম, এখুনই কাজ পাবেন, profile দেখুন", 60 * 24 * 2 - 5)]),
      c("bappa", "Darun 🔥", 60 * 24),
    ],
  };
  const photo: MockPost = {
    id: "18000000000000103",
    caption: "First client payment 💸",
    media_type: "IMAGE",
    media_product_type: "FEED",
    permalink: "https://www.instagram.com/p/MOCK103/",
    thumbnail_url: "https://picsum.photos/seed/cg103/300/300",
    timestamp: ago(60 * 24 * 40),
    comments: [c("subho", "Congrats dada", 60 * 24 * 39), c("payel", "Freelancing", 60 * 24 * 38)],
  };
  for (const p of [viral, older, photo]) {
    p.comments_count = p.comments.reduce((n, x) => n + 1 + (x.replies?.length ?? 0), 0);
  }
  return { me, posts: [viral, older, photo] };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function graphError(status: number, code: number, message: string, subcode?: number) {
  return json({ error: { message, type: "OAuthException", code, error_subcode: subcode, fbtrace_id: "mock" } }, status);
}

function strip(cm: MockComment): IgComment {
  const { replies: _r, ...rest } = cm;
  return rest;
}

/** Slice a list into a Graph-style page with a `paging.next` URL. */
function page<T>(url: URL, items: T[], pageSize: number, map: (t: T) => unknown) {
  const after = Number(url.searchParams.get("after") ?? 0);
  const slice = items.slice(after, after + pageSize);
  const body: { data: unknown[]; paging?: { cursors: { after: string }; next?: string } } = { data: slice.map(map) };
  if (after + pageSize < items.length) {
    const next = new URL(url);
    next.searchParams.set("after", String(after + pageSize));
    body.paging = { cursors: { after: String(after + pageSize) }, next: next.toString() };
  }
  return body;
}

export interface MockFetchOptions {
  pageSize?: number;
  /** Optional hook to inject failures in tests. Return a Response to short-circuit. */
  intercept?: (url: URL) => Response | undefined;
}

/** A fetch() that serves `world`. Mutating `world` changes later responses. */
export function createMockFetch(world: MockWorld, opts: MockFetchOptions = {}): FetchLike {
  const size = opts.pageSize ?? 4;
  const replySize = Math.max(2, size - 1);
  return async (input) => {
    const url = new URL(input);
    const hijack = opts.intercept?.(url);
    if (hijack) return hijack;
    if (url.searchParams.get("access_token") !== MOCK_TOKEN) {
      return graphError(400, 190, "Invalid OAuth access token - Cannot parse access token");
    }
    const parts = url.pathname.split("/").filter(Boolean).filter((p) => !/^v\d+\.\d+$/.test(p));

    if (parts[0] === "refresh_access_token") {
      return json({ access_token: MOCK_TOKEN, token_type: "bearer", expires_in: 60 * 60 * 24 * 60 });
    }
    if (parts[0] === "me" && parts.length === 1) return json(world.me);
    if (parts[0] === "me" && parts[1] === "media") {
      const sorted = [...world.posts].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return json(page(url, sorted, size, ({ comments: _c, ...m }) => m));
    }
    const [id, edge] = parts;
    const post = world.posts.find((p) => p.id === id);
    if (post && edge === "comments") {
      return json(
        page(url, post.comments, size, (cm) => {
          const replies = cm.replies ?? [];
          if (!replies.length) return strip(cm);
          const firstReplies = replies.slice(0, replySize).map(strip);
          const next = new URL(`${url.origin}/${cm.id}/replies?access_token=${MOCK_TOKEN}&after=${replySize}`);
          return {
            ...strip(cm),
            replies: { data: firstReplies, ...(replies.length > replySize ? { paging: { next: next.toString() } } : {}) },
          };
        }),
      );
    }
    if (edge === "replies") {
      const parent = world.posts.flatMap((p) => p.comments).find((cm) => cm.id === id);
      if (!parent) return graphError(400, 100, `Object with ID '${id}' does not exist`, 33);
      return json(page(url, parent.replies ?? [], replySize, (r) => ({ ...strip(r), parent_id: parent.id })));
    }
    return graphError(400, 100, `Object with ID '${id}' does not exist, cannot be loaded due to missing permissions, or does not support this operation`, 33);
  };
}

/** Shared mock world for IG_MOCK=true in the running app (lives as long as the server process). */
declare global {
  var __cgMockWorld: MockWorld | undefined;
}
export function sharedMockWorld(): MockWorld {
  if (!globalThis.__cgMockWorld) globalThis.__cgMockWorld = buildMockWorld();
  return globalThis.__cgMockWorld;
}
