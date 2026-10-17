import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
export default function AccountRecovery() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const reset = pathname === '/reset-password', verify = pathname === '/verify-email';
  return <form className="max-w-md mx-auto my-20 space-y-4 p-6 border border-coders-border rounded" onSubmit={async e => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post(verify ? '/auth/verify-email' : reset ? '/auth/reset-password' : '/auth/forgot-password',
        verify ? { token: params.get('token') } : reset ? { token: params.get('token'), password: value } : { email: value });
      setMessage(data.message);
    } catch (err: unknown) { setMessage((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Request failed'); }
    finally { setBusy(false); }
  }}>
    <h1 className="text-xl">{verify ? 'Verify email' : reset ? 'Reset password' : 'Recover account'}</h1>
    {!verify && <label className="block">{reset ? 'New password' : 'Email'}<input required type={reset ? 'password' : 'email'} minLength={reset ? 8 : undefined}
      maxLength={reset ? 72 : 254} className="block w-full bg-coders-surface border border-coders-border p-2" value={value} onChange={e => setValue(e.target.value)} /></label>}
    <button disabled={busy} className="bg-coders-green text-black p-2 rounded">{busy ? 'Please wait…' : 'Continue'}</button>
    {message && <p role="status">{message}</p>}<Link className="block" to="/login">Return to login</Link>
  </form>;
}
