/**
 * AES-256-GCM encryption for the Instagram access token at rest.
 * Format: "v1:<iv>:<tag>:<ciphertext>" (each part base64url).
 * Key: TOKEN_ENCRYPTION_KEY = 32 random bytes, base64 (generate with `npm run gen-key`).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyFrom(b64: string): Buffer {
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded. Run `npm run gen-key`.");
  }
  return key;
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
