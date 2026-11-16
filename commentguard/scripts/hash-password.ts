/** Usage: npm run hash-password -- 'your strong password'  → prints ADMIN_PASSWORD_HASH */
import { hashPassword } from "../src/lib/auth/password";

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error("Give a password of at least 12 characters:  npm run hash-password -- 'my long password'");
  process.exit(1);
}
hashPassword(pw).then((h) => console.log(`ADMIN_PASSWORD_HASH=${h}`));
