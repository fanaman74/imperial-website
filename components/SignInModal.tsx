'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-browser';

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  error?: boolean;
}

type Mode = 'signin' | 'signup' | 'verify';

export default function SignInModal({ open, onClose, error: authError }: SignInModalProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setMode('signin');
      setEmail('');
      setPassword('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createBrowserClient();

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
      } else {
        onClose();
        window.location.reload();
      }
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) {
        setError(err.message);
      } else {
        setMode('verify');
      }
    }

    setLoading(false);
  }

  if (mode === 'verify') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative z-10 bg-surface rounded-lg p-8 w-full max-w-sm mx-4 space-y-4 text-center">
          <h2 className="font-display text-xl italic">Check your email</h2>
          <p className="text-sm text-text-muted">
            We sent a confirmation link to <span className="text-text font-medium">{email}</span>. Click it to activate your account.
          </p>
          <button onClick={onClose} className="w-full border border-border rounded px-4 py-3 text-sm hover:border-accent transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-surface rounded-lg p-8 w-full max-w-sm mx-4 space-y-4">
        <h2 className="font-display text-xl italic text-center">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h2>

        {(authError || error) && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 rounded px-3 py-2">
            {error || 'Sign in failed, please try again.'}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Email</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-bg border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg rounded px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            className="w-full text-center text-sm text-text-muted hover:text-text transition-colors"
          >
            {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
