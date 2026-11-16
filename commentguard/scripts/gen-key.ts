/** Prints fresh random secrets for .env */
import { randomBytes } from "node:crypto";

console.log(`TOKEN_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
console.log(`CRON_SECRET=${randomBytes(24).toString("base64url")}`);
