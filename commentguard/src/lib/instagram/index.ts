import { env } from "@/lib/env";
import { InstagramClient } from "./client";
import { createMockFetch, sharedMockWorld } from "./mock";

export { InstagramClient } from "./client";
export { InstagramApiError } from "./errors";
export type * from "./types";

/** The client the app uses: real Instagram, or the fake one when IG_MOCK=true. */
export function makeInstagramClient(accessToken: string): InstagramClient {
  if (env.igMock) {
    return new InstagramClient({ accessToken, fetch: createMockFetch(sharedMockWorld()), sleep: async () => {} });
  }
  return new InstagramClient({ accessToken, apiVersion: env.igApiVersion });
}
