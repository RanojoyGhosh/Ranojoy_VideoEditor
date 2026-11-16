/**
 * The connected Instagram account: connect/reconnect with a token, decrypt the
 * token for API calls, and refresh it before it expires (~60 days).
 */
import { eq, ne } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { accounts, auditLog, type Account } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { InstagramApiError, makeInstagramClient, type InstagramClient } from "@/lib/instagram";

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
  return makeInstagramClient(getAccessToken(account));
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

/**
 * Validate a long-lived token with GET /me and save it (encrypted).
 * Used on first run (IG_ACCESS_TOKEN in .env) and from Settings → Reconnect.
 */
export async function connectWithToken(rawToken: string, by: "me" | "system" = "me"): Promise<Account> {
  const token = rawToken.trim();
  if (!token) throw new Error("Paste an access token first.");
  const client = makeInstagramClient(token);
  const me = await client.me();
  const igUserId = me.user_id ?? me.id;

  const others = await db.select({ id: accounts.id, username: accounts.username }).from(accounts).where(ne(accounts.igUserId, igUserId));
  if (others.length) {
    throw new Error(
      `This token belongs to @${me.username}, but @${others[0].username} is already connected. CommentGuard supports one account in Phase 1.`,
    );
  }

  // Try a refresh straight away: if the token is old enough, Instagram tells us the exact expiry.
  let finalToken = token;
  let expiresAt = new Date(Date.now() + 60 * DAY);
  let estimated = true;
  let refreshedAt: Date | null = null;
  try {
    const r = await client.refreshToken();
    finalToken = r.access_token;
    expiresAt = new Date(Date.now() + r.expires_in * 1000);
    estimated = false;
    refreshedAt = new Date();
  } catch {
    // Normal for a token generated less than 24h ago. We'll refresh later.
  }

  const values = {
    igUserId,
    igScopedId: me.id,
    username: me.username,
    accountType: me.account_type ?? null,
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
  await db.insert(auditLog).values({ action: "account_connected", detail: `@${me.username}`, by });
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
