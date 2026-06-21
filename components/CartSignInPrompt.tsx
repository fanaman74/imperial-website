'use client';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/components/UserProvider';
import { useOrder } from './OrderProvider';
import SignInModal from './SignInModal';

export default function CartSignInPrompt() {
  const { user, loading } = useUser();
  const { items } = useOrder();
  const [visible, setVisible] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const hasShown = useRef(false);

  useEffect(() => {
    if (!loading && !user && !hasShown.current && items.length > 0) {
      hasShown.current = true;
      const t = setTimeout(() => setVisible(true), 700);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, user, loading]);

  // Hide prompt once user signs in
  useEffect(() => {
    if (user) setVisible(false);
  }, [user]);

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-36 right-6 z-50 bg-bg border border-border rounded-2xl shadow-2xl p-5 w-[270px]">
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-text-muted hover:text-text transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="text-sm font-medium mb-1 pr-4">Suivre votre commande</p>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Connectez-vous pour conserver l&apos;historique de vos commandes.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSignIn(true)}
            className="flex-1 bg-accent text-bg text-xs font-medium py-2 px-3 rounded-lg hover:bg-accent/90 transition-colors"
          >
            Se connecter
          </button>
          <button
            onClick={() => setVisible(false)}
            className="flex-1 text-xs py-2 px-3 rounded-lg border border-border hover:border-text-muted transition-colors"
          >
            Continuer
          </button>
        </div>
      </div>
      <SignInModal open={showSignIn} onClose={() => { setShowSignIn(false); setVisible(false); }} />
    </>
  );
}
