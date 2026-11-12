import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

// The admin panel has its own sign-in (no WordPress accounts or passwords). Admin users are listed in the
// ADMIN_USERS setting as  username:scrypt.salt.hash:Display name  (comma-separated); only a salted hash of each
// password is stored. Create one with:  node scripts/admin-user.mjs <username> <password> [Display name]
// After sign-in, the person's name is sealed (AES-256-GCM) into an HttpOnly cookie for 12 hours.

export type AdminSession = { user: string; name: string; exp: number };

const COOKIE = 'alara_admin';
const HOURS = 12;

function key() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must be set (32+ characters).');
  return createHash('sha256').update(secret).digest();
}

function seal(data: AdminSession): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64url');
}

function unseal(token: string): AdminSession | null {
  try {
    const raw = Buffer.from(token, 'base64url');
    const d = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const s = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')) as AdminSession;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

type AdminUser = { user: string; hash: string; name: string };

function adminUsers(): AdminUser[] {
  return (process.env.ADMIN_USERS ?? '').split(',').map(x => x.trim()).filter(Boolean).map(x => {
    const [user, hash, ...name] = x.split(':');
    return { user: user.toLowerCase(), hash: hash ?? '', name: name.join(':') || user };
  });
}

function hashMatches(pass: string, stored: string): boolean {
  const [scheme, salt, hex] = stored.split('.');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const want = Buffer.from(hex, 'hex');
  const got = scryptSync(pass, Buffer.from(salt, 'hex'), want.length, { N: 16384, r: 8, p: 1 });
  return want.length === got.length && timingSafeEqual(want, got);
}

// slow down password guessing: 8 wrong tries per username or address → 15 minutes wait
const tries = new Map<string, { n: number; until: number }>();
export function loginBlocked(keys: string[]): boolean {
  const now = Date.now();
  return keys.some(k => { const t = tries.get(k); return !!t && t.n >= 8 && t.until > now; });
}
function noteFailure(keys: string[]) {
  const now = Date.now();
  for (const k of keys) {
    const t = tries.get(k);
    tries.set(k, { n: t && t.until > now ? t.n + 1 : 1, until: now + 15 * 60_000 });
  }
}

/** Checks a username + password against ADMIN_USERS. Always does the same work, found or not. */
export function checkAdmin(user: string, pass: string, keys: string[]): AdminUser | null {
  const u = adminUsers().find(a => a.user === user.trim().toLowerCase());
  const ok = hashMatches(pass, u?.hash ?? 'scrypt.00.' + '0'.repeat(64)) && !!u;
  if (!ok) { noteFailure(keys); return null; }
  keys.forEach(k => tries.delete(k));
  return u;
}

export async function startSession(s: Omit<AdminSession, 'exp'>) {
  (await cookies()).set(COOKIE, seal({ ...s, exp: Date.now() + HOURS * 3600_000 }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<AdminSession | null> {
  await connection(); // admin pages always render per request (the login expiry is checked against the clock)
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? unseal(token) : null;
}

/** Use at the top of every admin page and every admin action: no valid login → back to the sign-in page. */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getSession();
  if (!s) redirect('/admin/login');
  // without the shop key nothing can load: explain it on its own page instead of failing
  if (!(process.env.WC_ADMIN_KEY && process.env.WC_ADMIN_SECRET)) redirect('/admin/not-connected');
  return s;
}
