/** Helpers for "Connect with Meta" (Unified login / Facebook Login for Business). */
import { env } from "@/lib/env";

export const STATE_COOKIE = "cg_meta_state";
export const CALLBACK_PATH = "/api/auth/meta/callback";

/** The redirect URL to register in the Meta dashboard. Must match exactly. */
export function redirectUri(requestUrl: string): string {
  return `${env.appUrl ?? new URL(requestUrl).origin}${CALLBACK_PATH}`;
}

export function metaLoginConfigured(): boolean {
  return env.igMock || Boolean(env.metaAppId && env.metaAppSecret && env.metaConfigId);
}
