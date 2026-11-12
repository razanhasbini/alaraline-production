'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { Result } from '@/app/admin/actions';

/** A form that runs a server action and shows its result (success in green, problems in red). */
export default function ActionForm({ action, children, className }: {
  action: (prev: Result | null, fd: FormData) => Promise<Result>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state && <p className={`ad-msg ${state.ok ? 'is-ok' : 'is-err'}`} role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    </form>
  );
}

export function Submit({ children, className = 'ad-btn', pending = 'Saving…' }: { children: ReactNode; className?: string; pending?: string }) {
  const { pending: busy } = useFormStatus();
  return <button type="submit" className={className} disabled={busy}>{busy ? pending : children}</button>;
}

/** A button that asks before doing something hard to undo (still goes to WordPress's trash, so it can be restored). */
export function ConfirmSubmit({ children, question, className = 'ad-btn ad-danger' }: { children: ReactNode; question: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} onClick={e => { if (!confirm(question)) e.preventDefault(); }}>
      {pending ? 'Working…' : children}
    </button>
  );
}
