'use client';
import { useEffect, useState } from 'react';
import { useOrder } from './OrderProvider';

type Item = { name: string; price: number };

export default function CartToast() {
  const { lastAdded } = useOrder();
  const [displayed, setDisplayed] = useState<Item | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastAdded) {
      setDisplayed({ name: lastAdded.name, price: lastAdded.price });
      setVisible(true);
    } else if (displayed) {
      setVisible(false);
      const t = setTimeout(() => setDisplayed(null), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAdded]);

  if (!displayed) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none
        bg-bg border border-accent/40 px-5 py-3 rounded-full shadow-lg
        flex items-center gap-3 text-sm whitespace-nowrap
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <span className="text-accent font-bold">+</span>
      <span className="font-medium">{displayed.name}</span>
      <span className="text-text-muted">{displayed.price.toFixed(2)}&euro;</span>
    </div>
  );
}
