import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

declare global {
  // Reuse one pool across hot reloads in dev and warm serverless invocations.
  var __cgDb: { db: DB; sql: postgres.Sql } | undefined;
}

export function createDb(url: string) {
  const sql = postgres(url, {
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });
  return { db: drizzle(sql, { schema }), sql };
}

function init() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  if (!globalThis.__cgDb) globalThis.__cgDb = createDb(url);
  return globalThis.__cgDb;
}

/** Lazily connected database (so `next build` works without a database). */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = init().db as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
