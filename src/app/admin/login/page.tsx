import type { Metadata } from 'next';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { login } from '../actions';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="ad-login">
      <div className="ad-login-card">
        <p className="ad-brand">ÀLara <span>Admin</span></p>
        <h1>Sign in</h1>
        <ActionForm action={login} className="ad-form">
          <label>Username<input name="user" autoComplete="username" required /></label>
          <label>Password<input name="pass" type="password" autoComplete="current-password" required /></label>
          <Submit pending="Signing in…">Sign in</Submit>
        </ActionForm>
      </div>
    </div>
  );
}
