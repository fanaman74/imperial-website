'use client';
import { useState, useEffect } from 'react';
import type { Category } from '@/lib/types';
import { useOrder } from './OrderProvider';

function WithChili({ text }: { text: string }) {
  const parts = text.split(/(\(épicée\))/gi);
  return (
    <>
      {parts.map((part, i) =>
        /\(épicée\)/i.test(part)
          ? <span key={i} title="épicée" className="ml-1">🌶️</span>
          : part
      )}
    </>
  );
}

type MenuDict = {
  title: string;
  priceRestaurant: string;
  dish: string;
};

interface MenuProps {
  categories: Category[];
  dict: MenuDict;
}

export default function Menu({ categories, dict }: MenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id || '');
  const { addItem } = useOrder();

  // Sync activeCategoryId when categories change (e.g. locale switch, async data load)
  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.id === activeCategoryId)) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  return (
    <section id="menu" className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="font-chango text-3xl md:text-4xl text-center mb-10">
          {dict.title}
        </h2>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-4 py-1.5 text-xs uppercase tracking-wider rounded-full transition-colors ${
                  activeCategoryId === cat.id
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Items table */}
        {activeCategory && activeCategory.items.length > 0 && (
          <div className="max-w-[800px] mx-auto">
            {/* Column headers */}
            <div className="flex items-center text-xs uppercase tracking-wider text-text-muted border-b border-border pb-2 mb-4">
              <span className="w-10">#</span>
              <span className="flex-1">{dict.dish || "Plat"}</span>
              <span className="w-16 text-center">{dict.priceRestaurant}</span>
              <span className="w-10" />
            </div>

            {activeCategory.items.map(item => (
              <div key={item.id} className="flex items-center py-3 border-b border-border/50 group">
                <span className="w-10 text-text-muted text-sm">{item.num}</span>
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-sm font-medium"><WithChili text={item.name} /></span>
                  {item.description && (
                    <span className="text-text-muted text-xs ml-2">{item.description}</span>
                  )}
                </div>
                <span className="w-16 text-center text-sm">{item.priceRestaurant.toFixed(2)}&euro;</span>
                <div className="w-10 flex justify-end">
                  <button
                    onClick={() => addItem({
                      id: item.id,
                      name: item.name,
                      desc: item.description,
                      price: item.priceRestaurant,
                    })}
                    aria-label={`Add ${item.name} to cart`}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center
                      text-text-muted hover:border-accent hover:text-accent hover:bg-accent/10
                      opacity-0 group-hover:opacity-100 focus:opacity-100
                      transition-all duration-150"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeCategory && activeCategory.items.length === 0 && (
          <p className="text-center text-text-muted py-12">--</p>
        )}
      </div>
    </section>
  );
}
