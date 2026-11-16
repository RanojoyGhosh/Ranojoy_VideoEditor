import { env } from "@/lib/env";
import { InstagramClient, type ApiFlavor } from "./client";
import { createMockFetch, sharedMockWorld } from "./mock";

export { exchangeLoginCode, guessFlavor, InstagramClient, type ApiFlavor } from "./client";
export { InstagramApiError } from "./errors";
export type * from "./types";

/** The client the app uses: real Instagram, or the fake one when IG_MOCK=true. */
export function makeInstagramClient(accessToken: string, opts: { flavor?: ApiFlavor; igUserId?: string } = {}): InstagramClient {
  const common = { accessToken, flavor: opts.flavor, igUserId: opts.igUserId, apiVersion: env.igApiVersion };
  if (env.igMock) {
    return new InstagramClient({ ...common, fetch: createMockFetch(sharedMockWorld()), sleep: async () => {} });
  }
  return new InstagramClient(common);
}

/** Fetch to use for one-off calls (login code exchange) that aren't tied to a token. */
export function graphFetch() {
  return env.igMock ? createMockFetch(sharedMockWorld()) : undefined;
}
