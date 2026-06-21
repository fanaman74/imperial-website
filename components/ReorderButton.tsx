'use client';
import { useState } from 'react';
import { useOrder } from './OrderProvider';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function ReorderButton({ items }: { items: OrderItem[] }) {
  const { addItem } = useOrder();
  const [done, setDone] = useState(false);

  function handleReorder() {
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addItem({ id: item.id, name: item.name, desc: '', price: item.price });
      }
    });
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      onClick={handleReorder}
      className={`text-xs px-3 py-1.5 border rounded transition-colors ${
        done
          ? 'border-green-500/50 text-green-400'
          : 'border-accent/50 text-accent hover:bg-accent hover:text-bg'
      }`}
    >
      {done ? '✓ Added to cart' : 'Reorder'}
    </button>
  );
}
