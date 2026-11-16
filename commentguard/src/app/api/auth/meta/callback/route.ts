/**
 * Step 2 of "Connect with Meta": Meta redirects here with ?code=…&state=….
 * Exchange the code for a system-user token, find the Instagram account, save it.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { connectWithToken } from "@/lib/account";
import { getSessionEmail } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { exchangeLoginCode, graphFetch, InstagramApiError } from "@/lib/instagram";
import { CALLBACK_PATH, redirectUri, STATE_COOKIE } from "@/lib/meta-login";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function back(req: NextRequest, params: Record<string, string>) {
  const res = NextResponse.redirect(new URL(`/settings?${new URLSearchParams(params)}`, req.url));
  res.cookies.set(STATE_COOKIE, "", { path: CALLBACK_PATH, maxAge: 0 });
  return res;
}

function sameState(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest) {
  if (!(await getSessionEmail())) return NextResponse.redirect(new URL("/login", req.url));
  const q = req.nextUrl.searchParams;

  if (q.get("error")) {
    return back(req, { connect_error: q.get("error_description") || q.get("error_reason") || "Login was cancelled." });
  }
  if (!sameState(q.get("state"), req.cookies.get(STATE_COOKIE)?.value)) {
    return back(req, { connect_error: "The login link expired or didn't match. Tap Connect with Meta again." });
  }
  const code = q.get("code");
  if (!code) return back(req, { connect_error: "Meta didn't send a login code." });

  try {
    const token = await exchangeLoginCode({
      code,
      redirectUri: redirectUri(req.url),
      appId: env.metaAppId ?? "mockapp",
      appSecret: env.metaAppSecret ?? "mocksecret",
      apiVersion: env.igApiVersion,
      fetch: graphFetch(),
    });
    const account = await connectWithToken(token, "me", "facebook");
    return back(req, { connected: account.username });
  } catch (err) {
    const msg = err instanceof InstagramApiError ? err.summary : (err as Error).message;
    return back(req, { connect_error: msg.slice(0, 400) });
  }
}
