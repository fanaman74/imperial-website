'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-browser';

interface ProfileFormProps {
  initialName: string;
  email: string;
}

export default function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    const supabase = createBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSave} className="bg-surface rounded-lg p-6 space-y-4">
      <h2 className="text-sm uppercase tracking-wider text-text-muted">Profile</h2>
      <div>
        <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Email</label>
        <p className="text-sm py-2.5 text-text-muted">{email}</p>
      </div>
      <div>
        <label htmlFor="fullName" className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Full name</label>
        <input
          id="fullName"
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false); }}
          className="w-full bg-bg border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          placeholder="Your name"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {saved && <p className="text-green-400 text-sm">Saved.</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 bg-accent text-bg rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? '…' : 'Save changes'}
      </button>
    </form>
  );
}
