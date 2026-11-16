import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkAdminPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { parseIgTime } from "@/lib/ingestion/sync";

describe("token encryption", () => {
  const key = randomBytes(32).toString("base64");

  it("round-trips and never stores the plain token", () => {
    const blob = encryptSecret("IGAAtoken123", key);
    expect(blob).not.toContain("IGAAtoken123");
    expect(decryptSecret(blob, key)).toBe("IGAAtoken123");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("x", key)).not.toBe(encryptSecret("x", key));
  });

  it("rejects tampering and the wrong key", () => {
    const blob = encryptSecret("secret", key);
    const parts = blob.split(":");
    const ct = Buffer.from(parts[3], "base64url");
    ct[0] ^= 1;
    parts[3] = ct.toString("base64url");
    expect(() => decryptSecret(parts.join(":"), key)).toThrow();
    expect(() => decryptSecret(blob, randomBytes(32).toString("base64"))).toThrow();
  });

  it("insists on a long enough key", () => {
    expect(() => encryptSecret("x", randomBytes(16).toString("base64"))).toThrow(/at least 32/);
  });

  it("also accepts any long random text as the key", () => {
    const textKey = "correct-horse-battery-staple-and-more-words";
    expect(decryptSecret(encryptSecret("tok", textKey), textKey)).toBe("tok");
    expect(() => decryptSecret(encryptSecret("tok", textKey), textKey + "x")).toThrow();
  });
});

describe("admin password", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("$");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password!!", hash)).toBe(false);
  });

  it("checks a plain ADMIN_PASSWORD when no hash is set", async () => {
    expect(await checkAdminPassword("a-long-password-123", { plain: "a-long-password-123" })).toBe(true);
    expect(await checkAdminPassword("a-long-password-12", { plain: "a-long-password-123" })).toBe(false);
    // Too short to be allowed at all.
    expect(await checkAdminPassword("short", { plain: "short" })).toBe(false);
    expect(await checkAdminPassword("anything", {})).toBe(false);
    const hash = await hashPassword("hashed-password-xyz");
    expect(await checkAdminPassword("hashed-password-xyz", { hash, plain: "ignored-when-hash-set" })).toBe(true);
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "$2b$12$abc")).toBe(false);
  });
});

describe("parseIgTime", () => {
  it("parses Instagram's +0000 offset format", () => {
    expect(parseIgTime("2026-11-16T09:30:00+0000").toISOString()).toBe("2026-11-16T09:30:00.000Z");
    expect(parseIgTime("2026-11-16T15:00:00+0530").toISOString()).toBe("2026-11-16T09:30:00.000Z");
  });
});
