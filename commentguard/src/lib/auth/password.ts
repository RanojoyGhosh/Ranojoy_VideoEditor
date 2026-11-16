/**
 * Password hashing with Node's built-in scrypt.
 * Stored format: "scrypt:<N>:<r>:<p>:<salt>:<hash>" (base64url parts).
 * Deliberately has no "$" characters: Next.js expands "$VAR" inside .env files,
 * which silently breaks bcrypt-style hashes.
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

const N = 1 << 15;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64url");
  const key = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

/**
 * Check the admin password. ADMIN_PASSWORD_HASH (from `npm run hash-password`) wins;
 * otherwise a plain ADMIN_PASSWORD env variable (handy when deploying without Node
 * installed; Vercel keeps env variables secret). Passwords under 12 characters never pass.
 */
export async function checkAdminPassword(input: string, cfg: { hash?: string; plain?: string }): Promise<boolean> {
  if (cfg.hash) return verifyPassword(input, cfg.hash);
  if (!cfg.plain || cfg.plain.length < MIN_ADMIN_PASSWORD_LENGTH) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(cfg.plain).digest();
  return timingSafeEqual(a, b);
}
