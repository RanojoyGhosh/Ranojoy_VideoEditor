/**
 * The connected Instagram account: connect/reconnect with a token, decrypt the
 * token for API calls, and keep it valid.
 *
 * Two kinds of token are supported (see lib/instagram/client.ts):
 *  - Unified login system-user token ("EAA…", graph.facebook.com): usually never
 *    expires, nothing to refresh. This is what new Meta apps get.
 *  - Instagram Login token ("IG…", graph.instagram.com): 60 days, refreshed weekly.
 */
import { eq, ne } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { accounts, auditLog, type Account } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { guessFlavor, InstagramApiError, makeInstagramClient, type ApiFlavor, type InstagramClient } from "@/lib/instagram";

const DAY = 24 * 60 * 60 * 1000;
/** Refresh weekly; a refreshed token lasts ~60 days, so there is lots of slack. */
const REFRESH_EVERY_MS = 7 * DAY;
/** Instagram refuses to refresh tokens younger than 24h. */
const MIN_TOKEN_AGE_MS = 25 * 60 * 60 * 1000;
/** After a failed refresh, wait this long before trying again. */
const RETRY_AFTER_MS = 60 * 60 * 1000;

export async function getAccount(): Promise<Account | null> {
  const [row] = await db.select().from(accounts).limit(1);
  return row ?? null;
}

export function getAccessToken(account: Account): string {
  return decryptSecret(account.accessTokenEnc, env.tokenEncryptionKey);
}

export function clientFor(account: Account): InstagramClient {
  return makeInstagramClient(getAccessToken(account), { flavor: account.apiFlavor, igUserId: account.igUserId });
}

/** True if this comment was written by my own account (never touched). */
export function isOwnComment(
  c: { from?: { id?: string; username?: string }; username?: string },
  account: Pick<Account, "igUserId" | "igScopedId" | "username">,
): boolean {
  const ids = [account.igUserId, account.igScopedId].filter(Boolean);
  if (c.from?.id && ids.includes(c.from.id)) return true;
  const name = (c.from?.username ?? c.username ?? "").toLowerCase();
  return name !== "" && name === account.username.toLowerCase();
}

/** Pick the Instagram account a Facebook-side token should manage. */
async function resolveInstagramAccount(client: InstagramClient): Promise<string> {
  const hint = env.igUserIdHint;
  const found = await client.findInstagramAccounts();
  if (hint && (found.length === 0 || found.some((a) => a.id === hint))) return hint;
  if (found.length === 1) return found[0].id;
  if (found.length === 0) {
    throw new Error(
      "This token can't see any Instagram account. In the Meta dashboard, make sure the login configuration includes your Instagram account and the business_management permission (README → Meta setup), then connect again. Or set IG_USER_ID.",
    );
  }
  throw new Error(
    `This token can manage several Instagram accounts (${found.map((a) => `@${a.username ?? a.id}`).join(", ")}). Set IG_USER_ID to the one CommentGuard should guard.`,
  );
}

/**
 * Validate a token, find the Instagram account and save it (encrypted).
 * Used by "Connect with Meta", Settings → paste token, and IG_ACCESS_TOKEN on first run.
 */
export async function connectWithToken(rawToken: string, by: "me" | "system" = "me", flavorHint?: ApiFlavor): Promise<Account> {
  const token = rawToken.trim();
  if (!token) throw new Error("Paste an access token first.");
  const flavor = flavorHint ?? guessFlavor(token);

  let finalToken = token;
  let expiresAt: Date | null = new Date(Date.now() + 60 * DAY);
  let estimated = true;
  let refreshedAt: Date | null = null;
  let scopes: string[] | null = null;
  let client = makeInstagramClient(token, { flavor });

  if (flavor === "facebook") {
    // Ask Meta what this token is: expiry (0 = never) and permissions.
    if (env.metaAppToken) {
      try {
        const info = await client.debugToken(env.metaAppToken);
        if (info.is_valid === false) throw new Error("Meta says this token is not valid. Generate or log in again.");
        scopes = info.scopes ?? null;
        expiresAt = info.expires_at ? new Date(info.expires_at * 1000) : null;
        estimated = false;
      } catch (err) {
        if (!(err instanceof InstagramApiError)) throw err;
        // Can't inspect (e.g. wrong app secret): carry on, expiry unknown.
        expiresAt = null;
      }
    } else {
      expiresAt = null;
    }
    if (scopes && !scopes.includes("instagram_manage_comments")) {
      throw new Error("This token is missing the instagram_manage_comments permission. Add it to the login configuration and connect again.");
    }
    const igUserId = await resolveInstagramAccount(client);
    client = makeInstagramClient(token, { flavor, igUserId });
  }

  const me = await client.me();
  const igUserId = me.user_id ?? me.id;

  const others = await db.select({ id: accounts.id, username: accounts.username }).from(accounts).where(ne(accounts.igUserId, igUserId));
  if (others.length) {
    throw new Error(
      `This token belongs to @${me.username}, but @${others[0].username} is already connected. CommentGuard supports one account in Phase 1.`,
    );
  }

  if (flavor === "instagram") {
    // Try a refresh straight away: if the token is old enough, Instagram tells us the exact expiry.
    try {
      const r = await client.refreshToken();
      finalToken = r.access_token;
      expiresAt = new Date(Date.now() + r.expires_in * 1000);
      estimated = false;
      refreshedAt = new Date();
    } catch {
      // Normal for a token generated less than 24h ago. We'll refresh later.
    }
  }

  const values = {
    igUserId,
    igScopedId: me.id,
    username: me.username,
    accountType: me.account_type ?? null,
    apiFlavor: flavor,
    tokenScopes: scopes,
    accessTokenEnc: encryptSecret(finalToken, env.tokenEncryptionKey),
    tokenExpiresAt: expiresAt,
    tokenExpiryEstimated: estimated,
    tokenRefreshedAt: refreshedAt,
    connectedAt: new Date(),
    lastError: null,
    lastErrorAt: null,
  };
  const [account] = await db
    .insert(accounts)
    .values(values)
    .onConflictDoUpdate({ target: accounts.igUserId, set: values })
    .returning();
  await db.insert(auditLog).values({ action: "account_connected", detail: `@${me.username} (${flavor === "facebook" ? "Unified login" : "Instagram Login"})`, by });
  return account;
}

/** First run: connect from IG_ACCESS_TOKEN in .env if nothing is connected yet. */
export async function ensureAccount(): Promise<Account | null> {
  const existing = await getAccount();
  if (existing) return existing;
  const envToken = env.igAccessToken;
  if (!envToken) return null;
  return connectWithToken(envToken, "system");
}

export async function recordAccountError(account: Account, message: string) {
  await db.update(accounts).set({ lastError: message, lastErrorAt: new Date() }).where(eq(accounts.id, account.id));
}

/**
 * Refresh the token when due. Returns what happened, for the tick summary.
 * If refresh keeps failing, the panel shows the error and the expiry date;
 * Telegram alerts for "token expiring within 7 days" arrive in Step 4.
 */
export async function maybeRefreshToken(account: Account, now = new Date()): Promise<string | null> {
  // System-user tokens can't be refreshed (and usually never expire).
  if (account.apiFlavor !== "instagram") return null;
  const t = now.getTime();
  if (account.lastErrorAt && t - account.lastErrorAt.getTime() < RETRY_AFTER_MS && account.lastError?.startsWith("Token refresh")) {
    return null;
  }
  const due = account.tokenRefreshedAt
    ? t - account.tokenRefreshedAt.getTime() >= REFRESH_EVERY_MS
    : t - account.connectedAt.getTime() >= MIN_TOKEN_AGE_MS;
  if (!due) return null;

  try {
    const r = await clientFor(account).refreshToken();
    await db
      .update(accounts)
      .set({
        accessTokenEnc: encryptSecret(r.access_token, env.tokenEncryptionKey),
        tokenExpiresAt: new Date(t + r.expires_in * 1000),
        tokenExpiryEstimated: false,
        tokenRefreshedAt: now,
        lastError: null,
        lastErrorAt: null,
      })
      .where(eq(accounts.id, account.id));
    await db.insert(auditLog).values({ action: "token_refreshed", detail: `expires in ${Math.round(r.expires_in / 86400)} days` });
    return "token refreshed";
  } catch (err) {
    const msg = err instanceof InstagramApiError ? err.summary : (err as Error).message;
    await recordAccountError(account, `Token refresh failed: ${msg}`);
    return `token refresh failed (${msg})`;
  }
}
