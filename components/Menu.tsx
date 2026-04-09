'use client';
import { useState } from 'react';

type MenuItem = {
  id: string;
  num: string;
  name: string;
  description: string;
  priceRestaurant: number;
  priceTakeaway: number | null;
};

type Category = {
  id: string;
  name: string;
  items: MenuItem[];
};

type MenuDict = {
  title: string;
  priceRestaurant: string;
};

interface MenuProps {
  categories: Category[];
  dict: MenuDict;
}

export default function Menu({ categories, dict }: MenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id || '');

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
              <span className="flex-1">Plat</span>
              <span className="w-16 text-center">{dict.priceRestaurant}</span>
            </div>

            {activeCategory.items.map(item => (
              <div key={item.id} className="flex items-center py-3 border-b border-border/50">
                <span className="w-10 text-text-muted text-sm">{item.num}</span>
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.description && (
                    <span className="text-text-muted text-xs ml-2">{item.description}</span>
                  )}
                </div>
                <span className="w-16 text-center text-sm">{item.priceRestaurant.toFixed(2)}</span>
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
