/**
 * Minimal client for Meta's official Instagram APIs. Official API only:
 * no passwords, no scraping. Two flavours share the same comment endpoints:
 *
 *  - "facebook"  (Unified login / Facebook Login for Business, new Meta apps):
 *       https://graph.facebook.com/{version}, system-user token, calls use the
 *       Instagram account ID ({ig-user-id}/media).
 *  - "instagram" (Instagram API with Instagram Login, older apps):
 *       https://graph.instagram.com/{version}, 60-day user token, calls use /me.
 *
 * Step 1 is read-only: it only lists media, comments and replies, and
 * refreshes the token. Hide/delete calls arrive in Step 3.
 */
import { InstagramApiError } from "./errors";
import type { IgComment, IgDebugToken, IgErrorBody, IgMe, IgMedia, IgPage, IgTokenRefresh } from "./types";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export type ApiFlavor = "facebook" | "instagram";

export const GRAPH_HOSTS: Record<ApiFlavor, string> = {
  facebook: "https://graph.facebook.com",
  instagram: "https://graph.instagram.com",
};

/** Tokens from Facebook-side logins start with "EAA"; Instagram Login tokens with "IG". */
export function guessFlavor(token: string): ApiFlavor {
  return token.trim().startsWith("EAA") ? "facebook" : "instagram";
}

export interface InstagramClientOptions {
  accessToken: string;
  /** Default "instagram". */
  flavor?: ApiFlavor;
  /** Required for the "facebook" flavour (there is no /me for the Instagram account). */
  igUserId?: string;
  apiVersion?: string;
  baseUrl?: string;
  fetch?: FetchLike;
  /** Retries for network / 5xx errors (not for rate limits). */
  transientRetries?: number;
  /** Wait function (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

const COMMENT_FIELDS = "id,text,timestamp,username,from,parent_id,like_count,hidden";
const MEDIA_FIELDS =
  "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,comments_count";

export class InstagramClient {
  private readonly token: string;
  private readonly root: string;
  private readonly version?: string;
  readonly flavor: ApiFlavor;
  igUserId?: string;
  private readonly fetchImpl: FetchLike;
  private readonly retries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  /** Number of HTTP requests made (shown in the scan summary). */
  calls = 0;

  constructor(opts: InstagramClientOptions) {
    this.token = opts.accessToken;
    this.flavor = opts.flavor ?? "instagram";
    this.igUserId = opts.igUserId;
    this.version = opts.apiVersion;
    const base = (opts.baseUrl ?? GRAPH_HOSTS[this.flavor]).replace(/\/$/, "");
    this.root = opts.apiVersion ? `${base}/${opts.apiVersion}` : base;
    this.fetchImpl = opts.fetch ?? ((url, init) => fetch(url, init));
    this.retries = opts.transientRetries ?? 2;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** GET a path (relative to the versioned root) or an absolute `paging.next` URL. */
  async get<T>(pathOrUrl: string, params: Record<string, string> = {}): Promise<T> {
    const url = pathOrUrl.startsWith("http") ? new URL(pathOrUrl) : new URL(`${this.root}/${pathOrUrl.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (this.token && !url.searchParams.has("access_token")) url.searchParams.set("access_token", this.token);
    return this.request<T>(url, { method: "GET" });
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    let attempt = 0;
    for (;;) {
      attempt++;
      this.calls++;
      let res: Response;
      try {
        res = await this.fetchImpl(url.toString(), { ...init, cache: "no-store" });
      } catch (err) {
        if (attempt <= this.retries) {
          await this.sleep(1000 * attempt);
          continue;
        }
        throw new InstagramApiError(0, null, `Network error: ${(err as Error).message}`);
      }
      const body = (await res.json().catch(() => null)) as (T & IgErrorBody) | null;
      if (res.ok && body && !body.error) return body as T;
      const error = new InstagramApiError(res.status, body);
      if (error.kind === "transient" && attempt <= this.retries) {
        await this.sleep(1000 * attempt);
        continue;
      }
      throw error;
    }
  }

  /** Follow `paging.next` until the end (or `maxPages`). */
  async *paginate<T>(first: IgPage<T>, maxPages = 1000): AsyncGenerator<T> {
    let page: IgPage<T> | null = first;
    let n = 0;
    while (page) {
      for (const item of page.data ?? []) yield item;
      n++;
      const next: string | undefined = page.paging?.next;
      page = next && n < maxPages ? await this.get<IgPage<T>>(next) : null;
    }
  }

  private accountPath(): string {
    if (this.flavor === "instagram") return "me";
    if (!this.igUserId) throw new Error("Instagram account ID is not set for this token.");
    return this.igUserId;
  }

  /** The connected Instagram professional account. */
  async me(): Promise<IgMe> {
    if (this.flavor === "instagram") {
      return this.get<IgMe>("me", { fields: "id,user_id,username,account_type,name,profile_picture_url,media_count" });
    }
    const a = await this.get<IgMe>(this.accountPath(), { fields: "id,username,name,profile_picture_url,media_count" });
    return { ...a, user_id: a.id };
  }

  /**
   * "facebook" flavour only: Instagram accounts this token can manage.
   * Unified login (system-user token) → /me/assigned_instagram_accounts;
   * classic Facebook Login (user token + Page) → /me/accounts → instagram_business_account.
   */
  async findInstagramAccounts(): Promise<{ id: string; username?: string }[]> {
    const found = new Map<string, { id: string; username?: string }>();
    try {
      const first = await this.get<IgPage<{ id: string; username?: string }>>("me/assigned_instagram_accounts", { fields: "id,username" });
      for await (const a of this.paginate(first)) found.set(a.id, a);
    } catch (err) {
      if (!(err instanceof InstagramApiError) || err.kind === "rate_limit" || err.kind === "auth") throw err;
    }
    if (!found.size) {
      try {
        const pages = await this.get<IgPage<{ instagram_business_account?: { id: string; username?: string } }>>("me/accounts", {
          fields: "instagram_business_account{id,username}",
        });
        for await (const p of this.paginate(pages)) if (p.instagram_business_account) found.set(p.instagram_business_account.id, p.instagram_business_account);
      } catch (err) {
        if (!(err instanceof InstagramApiError) || err.kind === "rate_limit" || err.kind === "auth") throw err;
      }
    }
    return [...found.values()];
  }

  /** All my posts/reels, newest first. */
  async *listMedia(pageSize = 50): AsyncGenerator<IgMedia> {
    const first = await this.get<IgPage<IgMedia>>(`${this.accountPath()}/media`, { fields: MEDIA_FIELDS, limit: String(pageSize) });
    yield* this.paginate(first);
  }

  /** Replies under one comment (all pages). */
  async listReplies(commentId: string): Promise<IgComment[]> {
    const first = await this.get<IgPage<IgComment>>(`${commentId}/replies`, { fields: COMMENT_FIELDS, limit: "50" });
    const out: IgComment[] = [];
    for await (const r of this.paginate(first)) out.push(r);
    return out;
  }

  /**
   * Every comment AND reply on a post, flattened.
   * Replies are fetched in the same request (nested `replies{...}` field); only
   * comments with more replies than fit in the first page cost an extra call.
   * Spammers mostly reply under other people's comments, so replies matter most.
   */
  async listAllComments(mediaId: string): Promise<IgComment[]> {
    const first = await this.get<IgPage<IgComment>>(`${mediaId}/comments`, {
      fields: `${COMMENT_FIELDS},replies.limit(50){${COMMENT_FIELDS}}`,
      limit: "50",
    });
    const out: IgComment[] = [];
    for await (const c of this.paginate(first)) {
      const { replies, ...top } = c;
      out.push(top);
      if (!replies) continue;
      let list = replies.data ?? [];
      if (replies.paging?.next) list = await this.listReplies(c.id);
      for (const r of list) out.push({ ...r, parent_id: r.parent_id ?? c.id });
    }
    return out;
  }

  /**
   * Exchange the current long-lived token for a fresh one (~60 days).
   * Instagram only allows this once the token is at least 24 hours old and not yet expired.
   * "instagram" flavour only; system-user tokens don't need refreshing.
   */
  refreshToken(): Promise<IgTokenRefresh> {
    if (this.flavor !== "instagram") return Promise.reject(new Error("Only Instagram Login tokens can be refreshed."));
    const base = this.root.replace(/\/v\d+\.\d+$/, "");
    return this.get<IgTokenRefresh>(`${base}/refresh_access_token`, { grant_type: "ig_refresh_token" });
  }

  /**
   * Inspect a token with the app token ("app-id|app-secret").
   * expires_at 0 = never expires. Facebook-side tokens only.
   */
  async debugToken(appToken: string): Promise<IgDebugToken["data"]> {
    const host = this.version ? `${GRAPH_HOSTS.facebook}/${this.version}` : GRAPH_HOSTS.facebook;
    const r = await this.get<IgDebugToken>(`${host}/debug_token`, {
      input_token: this.token,
      access_token: appToken,
    });
    return r.data;
  }
}

/** Exchange the code from the Meta login dialog for an access token (Unified login). */
export async function exchangeLoginCode(opts: {
  code: string;
  redirectUri: string;
  appId: string;
  appSecret: string;
  apiVersion: string;
  fetch?: FetchLike;
}): Promise<string> {
  const c = new InstagramClient({ accessToken: "", flavor: "facebook", apiVersion: opts.apiVersion, fetch: opts.fetch });
  const r = await c.get<{ access_token: string }>("oauth/access_token", {
    client_id: opts.appId,
    client_secret: opts.appSecret,
    redirect_uri: opts.redirectUri,
    code: opts.code,
  });
  return r.access_token;
}
