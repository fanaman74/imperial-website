'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { createBrowserClient } from '@/lib/supabase-browser';
import SignInModal from '@/components/SignInModal';

export default function UserButton() {
  const { user, loading } = useUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('signin') === '1') {
      setModalOpen(true);
      setModalError(false);
    }
    if (searchParams.get('error') === 'auth_failed') {
      setModalOpen(true);
      setModalError(true);
    }
  }, [searchParams]);

  if (loading) return <div className="w-16 h-5" />;

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.refresh();
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => { setModalError(false); setModalOpen(true); }}
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          Sign in
        </button>
        <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} error={modalError} />
      </>
    );
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : (user.email?.[0]?.toUpperCase() ?? '?');
  const firstName = fullName.split(' ')[0] || user.email?.split('@')[0] || '';

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-text hover:text-accent transition-colors"
        aria-expanded={dropdownOpen}
        aria-label={`Account menu for ${firstName}`}
      >
        <span className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold select-none">
          {initials}
        </span>
        <span className="hidden lg:block">{firstName}</span>
      </button>
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-2 z-20 bg-surface border border-border rounded shadow-lg py-1 w-44">
            <Link
              href="/account"
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-bg transition-colors"
            >
              My account
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-text hover:bg-bg transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
