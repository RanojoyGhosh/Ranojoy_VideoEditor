/**
 * Minimal client for the official Instagram API with Instagram Login
 * (https://graph.instagram.com). Official API only: no passwords, no scraping.
 *
 * Step 1 is read-only: it only lists media, comments and replies, and
 * refreshes the token. Hide/delete calls arrive in Step 3.
 */
import { InstagramApiError } from "./errors";
import type { IgComment, IgErrorBody, IgMe, IgMedia, IgPage, IgTokenRefresh } from "./types";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface InstagramClientOptions {
  accessToken: string;
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
  private readonly fetchImpl: FetchLike;
  private readonly retries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  /** Number of HTTP requests made (shown in the scan summary). */
  calls = 0;

  constructor(opts: InstagramClientOptions) {
    this.token = opts.accessToken;
    const base = (opts.baseUrl ?? "https://graph.instagram.com").replace(/\/$/, "");
    this.root = opts.apiVersion ? `${base}/${opts.apiVersion}` : base;
    this.fetchImpl = opts.fetch ?? ((url, init) => fetch(url, init));
    this.retries = opts.transientRetries ?? 2;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** GET a path (relative to the versioned root) or an absolute `paging.next` URL. */
  async get<T>(pathOrUrl: string, params: Record<string, string> = {}): Promise<T> {
    const url = pathOrUrl.startsWith("http") ? new URL(pathOrUrl) : new URL(`${this.root}/${pathOrUrl.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (!url.searchParams.has("access_token")) url.searchParams.set("access_token", this.token);
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

  me(): Promise<IgMe> {
    return this.get<IgMe>("me", { fields: "id,user_id,username,account_type,name,profile_picture_url,media_count" });
  }

  /** All my posts/reels, newest first. */
  async *listMedia(pageSize = 50): AsyncGenerator<IgMedia> {
    const first = await this.get<IgPage<IgMedia>>("me/media", { fields: MEDIA_FIELDS, limit: String(pageSize) });
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
   */
  refreshToken(): Promise<IgTokenRefresh> {
    const base = this.root.replace(/\/v\d+\.\d+$/, "");
    return this.get<IgTokenRefresh>(`${base}/refresh_access_token`, { grant_type: "ig_refresh_token" });
  }
}
