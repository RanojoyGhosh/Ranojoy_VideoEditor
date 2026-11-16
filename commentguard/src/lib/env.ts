/**
 * Typed access to environment variables. Secrets are only ever read on the
 * server; nothing here is exposed to the browser.
 */
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export const env = {
  get adminEmail() {
    return req("ADMIN_EMAIL").trim().toLowerCase();
  },
  get adminPasswordHash() {
    return req("ADMIN_PASSWORD_HASH");
  },
  get sessionSecret() {
    const s = req("SESSION_SECRET");
    if (s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
    return s;
  },
  get tokenEncryptionKey() {
    return req("TOKEN_ENCRYPTION_KEY");
  },
  get cronSecret() {
    return req("CRON_SECRET");
  },
  /** Optional: first-run token. After it is saved (encrypted) in the database it is not needed. */
  get igAccessToken() {
    return process.env.IG_ACCESS_TOKEN || undefined;
  },
  /** Meta app (App settings → Basic). Needed for "Connect with Meta" and token checks. */
  get metaAppId() {
    return process.env.META_APP_ID || undefined;
  },
  get metaAppSecret() {
    return process.env.META_APP_SECRET || undefined;
  },
  /** Configuration ID from "API setup with Unified login" (Facebook Login for Business). */
  get metaConfigId() {
    return process.env.META_CONFIG_ID || undefined;
  },
  /** "app-id|app-secret": lets the server inspect tokens (debug_token). */
  get metaAppToken() {
    if (this.metaAppId && this.metaAppSecret) return `${this.metaAppId}|${this.metaAppSecret}`;
    return this.igMock ? "mockapp|mocksecret" : undefined;
  },
  /** Optional: which Instagram account to use if a token can manage several. */
  get igUserIdHint() {
    return process.env.IG_USER_ID || undefined;
  },
  /** Public URL of the app (e.g. https://commentguard.vercel.app); used for the login redirect. */
  get appUrl() {
    return process.env.APP_URL?.replace(/\/$/, "") || undefined;
  },
  get igApiVersion() {
    return process.env.IG_API_VERSION || "v25.0";
  },
  /** Serve fake Instagram data so the panel can be tried before Meta setup. */
  get igMock() {
    return process.env.IG_MOCK === "true";
  },
  get timezone() {
    return process.env.APP_TIMEZONE || "Asia/Kolkata";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
