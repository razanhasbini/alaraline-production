// Makes one ADMIN_USERS entry for the admin panel's sign-in (only a salted hash of the password is kept).
//   node scripts/admin-user.mjs <username> <password> [Display name]
// Put the printed line in ADMIN_USERS (comma-separate several people).
import { randomBytes, scryptSync } from 'node:crypto';

const [user, pass, ...name] = process.argv.slice(2);
if (!user || !pass || /[:,]/.test(user + name.join(' '))) {
  console.error('Usage: node scripts/admin-user.mjs <username> <password> [Display name]   (no ":" or "," in the name)');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pass, salt, 32, { N: 16384, r: 8, p: 1 });
console.log(`${user.toLowerCase()}:scrypt.${salt.toString("hex")}.${hash.toString('hex')}:${name.join(' ') || user}`);
