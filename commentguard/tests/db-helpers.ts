import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/lib/db";

export const hasDb = Boolean(process.env.TEST_DATABASE_URL);

let migrated = false;
export async function resetDb() {
  if (!migrated) {
    await migrate(db, { migrationsFolder: "./drizzle" });
    migrated = true;
  }
  await db.execute(
    sql`truncate audit_log, action_queue, comments, posts, accounts, user_lists, rules, settings restart identity cascade`,
  );
}
