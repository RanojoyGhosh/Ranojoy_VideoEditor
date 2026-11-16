/**
 * Test environment. DB tests run only when TEST_DATABASE_URL is set, e.g.
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/commentguard_test npm test
 * They wipe that database, so never point it at real data.
 */
import { randomBytes } from "node:crypto";

if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.IG_MOCK = "true";
delete process.env.IG_ACCESS_TOKEN;
