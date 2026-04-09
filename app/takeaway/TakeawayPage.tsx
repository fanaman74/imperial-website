'use client';
import { useState, useEffect } from 'react';
import { useOrder } from '@/components/OrderProvider';
import TakeawayPanel from '@/components/TakeawayPanel';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/lib/i18n/LanguageContext';

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

export default function TakeawayPage() {
  const { addItem } = useOrder();
  const { locale, dict } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/menu?locale=${locale}`)
      .then(r => r.json())
      .then(({ categories }) => {
        setCategories(categories || []);
        setActiveCategoryId(categories?.[0]?.id || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [locale]);

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  function handleAdd(item: MenuItem) {
    addItem({
      id: item.id,
      name: item.name,
      desc: item.description,
      price: item.priceRestaurant,
    });
    setAdded(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [item.id]: false })), 1000);
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[72px]">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <h1 className="font-chango text-3xl md:text-4xl text-center mb-2">
            Takeaway
          </h1>
          <p className="text-text-muted text-center text-sm mb-10">
            {locale === 'fr' && 'Ajoutez vos plats et passez commande en ligne'}
            {locale === 'nl' && 'Voeg gerechten toe en bestel online'}
            {locale === 'en' && 'Add dishes to your cart and order online'}
          </p>

          {loading && (
            <div className="flex justify-center items-center min-h-[300px]">
              <span className="text-text-muted text-sm uppercase tracking-widest">Chargement…</span>
            </div>
          )}

          {!loading && (
            <>
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

              {/* Items */}
              {activeCategory && activeCategory.items.length > 0 && (
                <div className="max-w-[800px] mx-auto">
                  <div className="flex items-center text-xs uppercase tracking-wider text-text-muted border-b border-border pb-2 mb-4">
                    <span className="w-10">#</span>
                    <span className="flex-1">
                      {locale === 'nl' ? 'Gerecht' : locale === 'en' ? 'Dish' : 'Plat'}
                    </span>
                    <span className="w-16 text-right">Prix</span>
                    <span className="w-20" />
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
                      <span className="w-16 text-right text-sm">{item.priceRestaurant.toFixed(2)}&euro;</span>
                      <div className="w-20 flex justify-end">
                        <button
                          onClick={() => handleAdd(item)}
                          className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-all ${
                            added[item.id]
                              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                              : 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent hover:text-bg'
                          }`}
                        >
                          {added[item.id] ? '✓' : '+'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeCategory && activeCategory.items.length === 0 && (
                <p className="text-center text-text-muted py-12">--</p>
              )}
            </>
          )}
        </div>
      </main>
      <Footer dict={{ nav: dict.nav, findUs: dict.findUs, footer: dict.footer }} />
      <TakeawayPanel />
    </>
  );
}
