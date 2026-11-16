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
