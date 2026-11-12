'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, use, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

// The theme's Login / Create Your Account / Lost your password? popups (Makeaholic "makeaholic-popup"), opened from
// the header's LOG IN. Accounts are the same WooCommerce customers; sign-in is an HttpOnly cookie on this site.

type View = 'login' | 'register' | 'lost' | null;
type Ctx = { open: (v: Exclude<View, null>) => void; signedIn: boolean };
const AuthContext = createContext<Ctx | null>(null);
export const useAuth = () => {
  const c = use(AuthContext);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
};

// "alara_in" is a plain flag cookie (no secret in it) set next to the real sign-in cookie
const SIGNED = 'alara-signed-in';
const subscribe = (cb: () => void) => { addEventListener(SIGNED, cb); return () => removeEventListener(SIGNED, cb); };
const readSigned = () => document.cookie.split('; ').some(c => c === 'alara_in=1');
export const announceSignIn = () => dispatchEvent(new Event(SIGNED));

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(null);
  const signedIn = useSyncExternalStore(subscribe, readSigned, () => false);
  const value = useMemo(() => ({ open: (v: Exclude<View, null>) => setView(v), signedIn }), [signedIn]);
  return (
    <AuthContext value={value}>
      {children}
      {view && <Popup view={view} setView={setView} />}
    </AuthContext>
  );
}

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await res.json();
  } catch { return { ok: false, message: 'The shop could not be reached. Please try again.' }; }
}

function Popup({ view, setView }: { view: Exclude<View, null>; setView: (v: View) => void }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setView(null), [setView]);
  const go = (v: Exclude<View, null>) => (e: React.MouseEvent) => { e.preventDefault(); setMsg(null); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [close]);

  const submit = (action: 'login' | 'register' | 'lost') => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const f = Object.fromEntries(fd) as Record<string, string>;
    const missing = [...e.currentTarget.querySelectorAll<HTMLInputElement>('input[required]')].find(i => !i.value.trim());
    if (missing) { setMsg({ ok: false, text: `Please enter your ${missing.placeholder.replace(/^Your /, '').toLowerCase()}.` }); missing.focus(); return; }
    if (action === 'register' && !fd.get('accept_account')) { setMsg({ ok: false, text: 'Please accept the Terms and Privacy Policy.' }); return; }
    setBusy(true); setMsg(null);
    const d = await post(action === 'login'
      ? { action, username: f.user_login, password: f.password, remember: fd.get('rememberme') === 'forever' }
      : action === 'register'
        ? { action, fullname: f.fullname, username: f.username, email: f.email, password: f.password }
        : { action, username: f.user_login });
    setBusy(false);
    if (!d.ok) { setMsg({ ok: false, text: d.message ?? 'Something went wrong. Please try again.' }); return; }
    if (action === 'lost') { setMsg({ ok: true, text: 'Password reset email has been sent. Please check your inbox.' }); return; }
    setMsg({ ok: true, text: action === 'login' ? 'Login successful, redirecting…' : 'Account created, redirecting…' });
    announceSignIn();
    setTimeout(() => { close(); router.refresh(); }, 600);
  };

  const title = view === 'login' ? 'Login' : view === 'register' ? 'Create Your Account' : 'Lost your password?';
  return (
    <div className="mk-popup" role="dialog" aria-modal="true" aria-labelledby="mk-popup-title">
      <div className="mk-popup-overlay" onClick={close} />
      <div className="mk-popup-content">
        <button type="button" className="mk-popup-close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>
        </button>
        <div className="mk-popup-inner">
          <div className="mk-popup-head">
            {/* the brand's ÀL monogram, pale and slanted, behind the title (in place of the theme's leaf) */}
            <span className="mk-mark" aria-hidden="true">ÀL</span>
            <h3 id="mk-popup-title">{title}</h3>
            {view === 'login' && <p>Don&apos;t have an account yet? <a href="#" onClick={go('register')}>Sign up for free</a></p>}
            {view === 'register' && <p>Already have an account? <a href="#" onClick={go('login')}>Log in</a></p>}
            {view === 'lost' && <p>Please enter your username or email address. You will receive a link to create a new password via email. Remember now? <a href="#" onClick={go('login')}>Back to login</a></p>}
          </div>

          {view === 'login' && (
            <form className="mk-form" onSubmit={submit('login')} noValidate>
              <Input id="ip_user_login" name="user_login" label="Username or email" placeholder="Your username or email" auto="username" required />
              <PasswordInput id="ip_password" auto="current-password" />
              <div className="mk-row">
                <label className="mk-check"><input type="checkbox" name="rememberme" value="forever" /> <span>Remember me</span></label>
                <Link href="/my-account/lost-password" className="mk-forgot" onClick={go('lost')}>Forgot your password?</Link>
              </div>
              <Messages msg={msg} />
              <button type="submit" className="mk-submit" disabled={busy}>Log In</button>
            </form>
          )}

          {view === 'register' && (
            <form className="mk-form" onSubmit={submit('register')} noValidate>
              <Input id="ip_reg_fullname" name="fullname" label="Your Name" placeholder="Your Name" auto="name" required />
              <Input id="ip_reg_username" name="username" label="Username" placeholder="Username" auto="username" required />
              <Input id="ip_reg_email" name="email" type="email" label="Email" placeholder="Your Email" auto="email" required />
              <PasswordInput id="ip_reg_password" auto="new-password" />
              <label className="mk-check mk-accept"><input type="checkbox" name="accept_account" value="1" /> <span>Accept the Terms and <b>Privacy Policy</b></span></label>
              <Messages msg={msg} />
              <button type="submit" className="mk-submit" disabled={busy}>Register</button>
            </form>
          )}

          {view === 'lost' && (
            <form className="mk-form" onSubmit={submit('lost')} noValidate>
              <Input id="lost_password_user_login" name="user_login" label="Username or email" placeholder="Your username or email" auto="username" required />
              <Messages msg={msg} />
              <button type="submit" className="mk-submit" disabled={busy}>Reset password</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ id, name, label, placeholder, type = 'text', auto, required }: { id: string; name: string; label: string; placeholder: string; type?: string; auto?: string; required?: boolean }) {
  return (
    <div className="mk-group">
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} name={name} type={type} placeholder={placeholder} autoComplete={auto} required={required} />
    </div>
  );
}

function PasswordInput({ id, auto }: { id: string; auto: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mk-group mk-pass">
      <label htmlFor={id} className="sr-only">Password</label>
      <input id={id} name="password" type={show ? 'text' : 'password'} placeholder="Password" autoComplete={auto} required />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{show && <path d="M3 3l18 18" />}</svg>
      </button>
    </div>
  );
}

function Messages({ msg }: { msg: { ok: boolean; text: string } | null }) {
  return <div className={`mk-msg${msg ? (msg.ok ? ' is-ok' : ' is-err') : ''}`} role="status" aria-live="polite">{msg?.text}</div>;
}
