/**
 * Single-admin session: a signed JWT in an httpOnly cookie.
 * `requireAdmin()` is the real check, used by every page and server action.
 * (proxy.ts only does a fast optimistic redirect.)
 */
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "cg_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days: I log in on my phone rarely

const secretKey = () => new TextEncoder().encode(env.sessionSecret);

export async function createSession(email: string) {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionEmail(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    // A session only counts if it is for the configured admin email.
    return payload.sub === env.adminEmail ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<string> {
  const email = await getSessionEmail();
  if (!email) redirect("/login");
  return email;
}
