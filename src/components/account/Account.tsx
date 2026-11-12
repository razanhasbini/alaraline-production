'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import OrderDetails from '@/components/OrderDetails';
import { announceSignIn } from './AuthPopup';
import { addressLines, orderDate, usd, type Address, type Customer, type OrderFull, type OrderSummary } from '@/lib/orders';

type Props = { path: string[]; resetKey: string; resetLogin: string; next: string };

async function api<T = { ok: boolean; message?: string; user?: Customer | null }>(body?: Record<string, unknown>, query = ''): Promise<T & { ok: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/account${query}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    return await res.json();
  } catch { return { ok: false, message: 'The shop could not be reached. Please try again.' } as T & { ok: boolean; message?: string }; }
}

/** WooCommerce's My account, page for page. The accounts themselves stay WooCommerce customers. */
export default function Account({ path, resetKey, resetLogin, next }: Props) {
  const [user, setUser] = useState<Customer | null | undefined>(undefined);
  const router = useRouter();
  useEffect(() => { api(undefined).then(d => setUser(d.user ?? null)); }, []);

  const signedIn = useCallback((u: Customer | null | undefined) => {
    setUser(u ?? null);
    announceSignIn();
    if (next) router.push(next); else router.push('/my-account');
  }, [next, router]);

  const [section] = path;
  if (section === 'lost-password') return <div className="wrap acc"><LostPassword /></div>;
  if (section === 'reset-password') return <div className="wrap acc"><ResetPassword k={resetKey} login={resetLogin} onDone={signedIn} /></div>;
  if (user === undefined) return <div className="wrap acc" style={{ minHeight: '40vh' }}><p>Loading…</p></div>;
  if (!user) return <div className="wrap acc"><Auth onDone={signedIn} /></div>;

  const logout = async () => { await api({ action: 'logout' }); announceSignIn(); setUser(null); router.push('/my-account'); };
  const nav = [
    { href: '/my-account', label: 'Dashboard', on: !section },
    { href: '/my-account/orders', label: 'Orders', on: section === 'orders' || section === 'view-order' },
    { href: '/my-account/downloads', label: 'Downloads', on: section === 'downloads' },
    { href: '/my-account/edit-address', label: 'Addresses', on: section === 'edit-address' },
    { href: '/my-account/edit-account', label: 'Account details', on: section === 'edit-account' },
  ];
  return (
    <div className="wrap acc acc-dash">
      <nav className="acc-nav" aria-label="Account pages">
        {nav.map(n => <Link key={n.href} href={n.href} aria-current={n.on ? 'page' : undefined}>{n.label}</Link>)}
        <button type="button" onClick={logout}>Log out</button>
      </nav>
      <div className="acc-main">
        {!section && (
          <>
            <p>Hello <b>{user.display_name || user.email}</b> (not <b>{user.display_name || user.email}</b>? <button type="button" className="acc-link" onClick={logout}>Log out</button>)</p>
            <p>From your account dashboard you can view your <Link href="/my-account/orders">recent orders</Link>, manage your <Link href="/my-account/edit-address">shipping and billing addresses</Link>, and <Link href="/my-account/edit-account">edit your password and account details</Link>.</p>
          </>
        )}
        {section === 'orders' && <Orders />}
        {section === 'view-order' && <ViewOrder id={Number(path[1])} />}
        {section === 'downloads' && <div className="notice">No downloads available yet. <Link href="/shop">Browse products</Link></div>}
        {section === 'edit-address' && <Addresses user={user} type={path[1] === 'billing' || path[1] === 'shipping' ? path[1] : null} onSaved={setUser} />}
        {section === 'edit-account' && <AccountDetails user={user} onSaved={setUser} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- login + register */

function Auth({ onDone }: { onDone: (u: Customer | null | undefined) => void }) {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = (action: 'login' | 'register') => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setErr('');
    const d = await api({ action, ...f });
    setBusy(false);
    if (d.ok) onDone(d.user); else setErr(d.message ?? 'Something went wrong.');
  };
  return (
    <>
      {err && <p className="notice is-err" role="alert"><b>Error:</b> {err}</p>}
      <div className="acc-auth">
        <form className="acc-box" onSubmit={submit('login')}>
          <h2>Login</h2>
          <Field name="username" label="Username or email address" required auto="username" />
          <Password name="password" label="Password" auto="current-password" />
          <div className="acc-row">
            <label className="co-check"><input type="checkbox" name="remember" defaultChecked /> Remember me</label>
            <Link href="/my-account/lost-password">Lost your password?</Link>
          </div>
          <button type="submit" className="btn btn-black btn-wide" disabled={busy}>Log in</button>
        </form>
        <form className="acc-box" onSubmit={submit('register')}>
          <h2>Register</h2>
          <Field name="email" label="Email address" type="email" required auto="email" />
          <Password name="password" label="Password" auto="new-password" min={8} />
          <p>Your personal data will be used to support your experience throughout this website, to manage access to your account, and for other purposes described in our privacy policy.</p>
          <button type="submit" className="btn btn-black btn-wide" disabled={busy}>Register</button>
        </form>
      </div>
    </>
  );
}

function LostPassword() {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null), [busy, setBusy] = useState(false);
  return (
    <form className="acc-box" style={{ maxWidth: 560 }} onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      const d = await api({ action: 'lost', username: new FormData(e.currentTarget).get('username') });
      setBusy(false);
      setState(d.ok ? { ok: true, text: 'Password reset email has been sent. A password reset email has been sent to the email address on file for your account, but may take several minutes to show up in your inbox.' } : { ok: false, text: d.message ?? 'Something went wrong.' });
    }}>
      {state && <p className={`notice ${state.ok ? 'is-ok' : 'is-err'}`} role="status">{state.text}</p>}
      <p>Lost your password? Please enter your username or email address. You will receive a link to create a new password via email.</p>
      <Field name="username" label="Username or email" required auto="username" />
      <button type="submit" className="btn btn-black" disabled={busy}>Reset password</button>
    </form>
  );
}

function ResetPassword({ k, login, onDone }: { k: string; login: string; onDone: (u: Customer | null | undefined) => void }) {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (!k || !login) return <p className="notice is-err">This key is invalid or has already been used. Please reset your password again if needed. <Link href="/my-account/lost-password">Lost your password?</Link></p>;
  return (
    <form className="acc-box" style={{ maxWidth: 560 }} onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      if (f.get('password') !== f.get('password2')) { setErr('Passwords do not match.'); return; }
      setBusy(true); setErr('');
      const d = await api({ action: 'reset', key: k, login, password: f.get('password') });
      setBusy(false);
      if (d.ok) onDone(d.user); else setErr(d.message ?? 'Something went wrong.');
    }}>
      {err && <p className="notice is-err" role="alert">{err}</p>}
      <p>Enter a new password below.</p>
      <Password name="password" label="New password" auto="new-password" min={8} />
      <Password name="password2" label="Re-enter new password" auto="new-password" min={8} />
      <button type="submit" className="btn btn-black" disabled={busy}>Save</button>
    </form>
  );
}

/* ---------------------------------------------------------------- signed in */

function Orders() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  useEffect(() => { api<{ orders?: OrderSummary[] }>(undefined, '?what=orders').then(d => setOrders(d.orders ?? [])); }, []);
  if (!orders) return <p>Loading…</p>;
  if (orders.length === 0) return <div className="notice">No order has been made yet. <Link href="/shop">Browse products</Link></div>;
  return (
    <table className="acc-table">
      <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id}>
            <td><Link href={`/my-account/view-order/${o.id}`}>#{o.number}</Link></td>
            <td data-label="Date">{orderDate(o.date)}</td>
            <td data-label="Status">{o.status_label}</td>
            <td data-label="Total">{usd(o.total)} for {o.item_count} item{o.item_count === 1 ? '' : 's'}</td>
            <td><Link className="btn btn-black" href={`/my-account/view-order/${o.id}`}>View</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ViewOrder({ id }: { id: number }) {
  const [order, setOrder] = useState<OrderFull | null | undefined>(undefined);
  useEffect(() => { api<{ order?: OrderFull }>(undefined, `?what=order&id=${id}`).then(d => setOrder(d.ok ? d.order ?? null : null)); }, [id]);
  if (order === undefined) return <p>Loading…</p>;
  if (!order) return <p className="notice is-err">Invalid order. <Link href="/my-account/orders">My account</Link></p>;
  return (
    <div>
      <p>Order #<mark>{order.number}</mark> was placed on <mark>{orderDate(order.date)}</mark> and is currently <mark>{order.status_label}</mark>.</p>
      <OrderDetails order={order} />
    </div>
  );
}

function Addresses({ user, type, onSaved }: { user: Customer; type: 'billing' | 'shipping' | null; onSaved: (u: Customer) => void }) {
  const router = useRouter();
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (!type) {
    return (
      <>
        <p>The following addresses will be used on the checkout page by default.</p>
        <div className="acc-addresses">
          {(['billing', 'shipping'] as const).map(t => {
            const lines = addressLines(user[t]);
            return (
              <div key={t}>
                <div className="acc-row"><h2 className="acc-h">{t === 'billing' ? 'Billing address' : 'Shipping address'}</h2><Link href={`/my-account/edit-address/${t}`}>{lines.length ? 'Edit' : 'Add'} {t === 'billing' ? 'Billing address' : 'Shipping address'}</Link></div>
                <address>{lines.length ? lines.map(l => <span key={l}>{l}</span>) : <em>You have not set up this type of address yet.</em>}</address>
              </div>
            );
          })}
        </div>
      </>
    );
  }
  const a: Partial<Address> = user[type];
  return (
    <form className="acc-box" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setErr('');
      const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
      const d = await api({ action: 'update', [type]: { ...f, country: 'LB' } });
      setBusy(false);
      if (d.ok && d.user) { onSaved(d.user); router.push('/my-account/edit-address'); } else setErr(d.message ?? 'Something went wrong.');
    }}>
      <h2>{type === 'billing' ? 'Billing address' : 'Shipping address'}</h2>
      {err && <p className="notice is-err" role="alert">{err}</p>}
      <div className="co-fields">
        <Field name="first_name" label="First name" required def={a.first_name} />
        <Field name="last_name" label="Last name" required def={a.last_name} />
        <div className="co-field is-wide"><span>Country / Region <abbr title="required">*</abbr></span><strong>Lebanon</strong></div>
        <Field name="address_1" label="Street address" required wide def={a.address_1} placeholder="House number and street name" />
        <Field name="address_2" label="Apartment, suite, unit, etc." wide def={a.address_2} />
        <Field name="city" label="Town / City" required wide def={a.city} />
        <Field name="state" label="State / County" wide def={a.state} />
        <Field name="postcode" label="Postcode / ZIP" required wide def={a.postcode} />
        {type === 'billing' && <Field name="phone" label="Phone" type="tel" wide def={a.phone} />}
        {type === 'billing' && <Field name="email" label="Email address" type="email" required wide def={a.email} />}
      </div>
      <button type="submit" className="btn btn-black" disabled={busy}>Save address</button>
    </form>
  );
}

function AccountDetails({ user, onSaved }: { user: Customer; onSaved: (u: Customer) => void }) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null), [busy, setBusy] = useState(false);
  return (
    <form className="acc-box" onSubmit={async e => {
      e.preventDefault();
      const form = e.currentTarget;
      const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
      if (f.new_password && f.new_password !== f.confirm_password) { setState({ ok: false, text: 'New passwords do not match.' }); return; }
      setBusy(true);
      const d = await api({ action: 'update', account: f });
      setBusy(false);
      if (d.ok && d.user) { onSaved(d.user); setState({ ok: true, text: 'Account details changed successfully.' }); form.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(i => { i.value = ''; }); }
      else setState({ ok: false, text: d.message ?? 'Something went wrong.' });
    }}>
      {state && <p className={`notice ${state.ok ? 'is-ok' : 'is-err'}`} role="status">{state.text}</p>}
      <div className="co-fields">
        <Field name="first_name" label="First name" required def={user.first_name} auto="given-name" />
        <Field name="last_name" label="Last name" required def={user.last_name} auto="family-name" />
        <div className="is-wide co-field">
          <Field name="display_name" label="Display name" required wide def={user.display_name} />
          <small><em>This will be how your name will be displayed in the account section and in reviews</em></small>
        </div>
        <Field name="email" label="Email address" type="email" required wide def={user.email} auto="email" />
      </div>
      <fieldset className="acc-box" style={{ border: '1px solid #eee', padding: 20 }}>
        <legend>Password change</legend>
        <Password name="current_password" label="Current password (leave blank to leave unchanged)" auto="current-password" optional />
        <Password name="new_password" label="New password (leave blank to leave unchanged)" auto="new-password" optional min={8} />
        <Password name="confirm_password" label="Confirm new password" auto="new-password" optional />
      </fieldset>
      <button type="submit" className="btn btn-black" disabled={busy}>Save changes</button>
    </form>
  );
}

/* ---------------------------------------------------------------- fields */

function Field({ name, label, type = 'text', required, wide = true, def, auto, placeholder }: { name: string; label: string; type?: string; required?: boolean; wide?: boolean; def?: string; auto?: string; placeholder?: string }) {
  return (
    <label className={`co-field${wide ? ' is-wide' : ''}`}>
      <span>{label} {required ? <abbr title="required">*</abbr> : <em>(optional)</em>}</span>
      <input name={name} type={type} required={required} defaultValue={def} autoComplete={auto} placeholder={placeholder} />
    </label>
  );
}

function Password({ name, label, auto, min, optional }: { name: string; label: string; auto: string; min?: number; optional?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label className="co-field is-wide acc-pass">
      <span>{label} {!optional && <abbr title="required">*</abbr>}</span>
      <input name={name} type={show ? 'text' : 'password'} required={!optional} minLength={min} autoComplete={auto} />
      <button type="button" className="acc-eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{show && <path d="M3 3l18 18" />}</svg>
      </button>
    </label>
  );
}
