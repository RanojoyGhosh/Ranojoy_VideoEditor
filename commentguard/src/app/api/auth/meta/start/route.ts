/**
 * Step 1 of "Connect with Meta": send me to Meta's login dialog with the
 * Unified login configuration. Meta sends me back to /api/auth/meta/callback.
 */
import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionEmail } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { metaLoginConfigured, redirectUri, STATE_COOKIE, CALLBACK_PATH } from "@/lib/meta-login";
import { MOCK_LOGIN_CODE } from "@/lib/instagram/mock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await getSessionEmail())) return NextResponse.redirect(new URL("/login", req.url));
  if (!metaLoginConfigured()) {
    return NextResponse.redirect(new URL("/settings?connect_error=Set+META_APP_ID%2C+META_APP_SECRET+and+META_CONFIG_ID+first.", req.url));
  }

  const state = randomBytes(24).toString("base64url");
  const target = env.igMock
    ? new URL(`${redirectUri(req.url)}?code=${MOCK_LOGIN_CODE}&state=${state}`)
    : new URL(`https://www.facebook.com/${env.igApiVersion}/dialog/oauth`);
  if (!env.igMock) {
    target.searchParams.set("client_id", env.metaAppId!);
    target.searchParams.set("config_id", env.metaConfigId!);
    target.searchParams.set("redirect_uri", redirectUri(req.url));
    target.searchParams.set("response_type", "code");
    target.searchParams.set("state", state);
  }

  const res = NextResponse.redirect(target);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: CALLBACK_PATH,
    maxAge: 600,
  });
  return res;
}
