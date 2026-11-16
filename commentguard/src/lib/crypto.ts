/**
 * AES-256-GCM encryption for the Instagram access token at rest.
 * Format: "v1:<iv>:<tag>:<ciphertext>" (each part base64url).
 * Key: TOKEN_ENCRYPTION_KEY = either 32 random bytes in base64 (`npm run gen-key`)
 * or any random text of 32+ characters (e.g. from a password generator), which
 * is turned into a 32-byte key with SHA-256.
 * Changing the key later means reconnecting Instagram (the old token can't be read).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFrom(secret: string): Buffer {
  const raw = secret.trim();
  // Exactly 32 bytes of base64 (what `npm run gen-key` prints).
  if (/^[A-Za-z0-9+/]{43}=$/.test(raw)) return Buffer.from(raw, "base64");
  if (raw.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be at least 32 characters of random text.");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptSecret(plain: string, keyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(keyB64), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(":");
}

export function decryptSecret(blob: string, keyB64: string): string {
  const [v, iv, tag, ct] = blob.split(":");
  if (v !== "v1" || !iv || !tag || ct === undefined) throw new Error("Unrecognised encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(keyB64), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
