import type { IgErrorBody } from "./types";

/**
 * What the rest of the app needs to know about a failed API call:
 *  - rate_limit: back off, try much later
 *  - auth:       token expired/revoked → reconnect needed
 *  - not_found:  the comment/post no longer exists (treat a delete as done)
 *  - transient:  network / 5xx, safe to retry soon
 *  - permission: missing permission or not allowed on this object
 *  - other
 */
export type IgErrorKind = "rate_limit" | "auth" | "not_found" | "transient" | "permission" | "other";

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80002]);
const TRANSIENT_CODES = new Set([1, 2]);

export class InstagramApiError extends Error {
  readonly kind: IgErrorKind;
  readonly status: number;
  readonly code?: number;
  readonly subcode?: number;
  readonly fbtraceId?: string;

  constructor(status: number, body: IgErrorBody | null, fallbackMessage?: string) {
    const e = body?.error;
    super(e?.message || fallbackMessage || `Instagram API error (HTTP ${status})`);
    this.name = "InstagramApiError";
    this.status = status;
    this.code = e?.code;
    this.subcode = e?.error_subcode;
    this.fbtraceId = e?.fbtrace_id;
    this.kind = classify(status, e?.code, e?.error_subcode, e?.message);
  }

  /** Short text for logs and the panel (never contains the token). */
  get summary() {
    return `${this.kind}: ${this.message}${this.code !== undefined ? ` (code ${this.code}${this.subcode ? `/${this.subcode}` : ""})` : ""}`;
  }
}

export function classify(status: number, code?: number, subcode?: number, message = ""): IgErrorKind {
  if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) return "rate_limit";
  if (code === 190 || status === 401) return "auth";
  // 100/33: "Object with ID ... does not exist, cannot be loaded due to missing permissions, or does not support this operation"
  if (code === 100 && (subcode === 33 || /does not exist/i.test(message))) return "not_found";
  if (status === 404) return "not_found";
  if (status >= 500 || (code !== undefined && TRANSIENT_CODES.has(code))) return "transient";
  if (code === 10 || (code !== undefined && code >= 200 && code < 300) || status === 403) return "permission";
  return "other";
}
