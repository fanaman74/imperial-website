'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const locales = ['fr', 'nl', 'en'] as const;
const localeLabels = { fr: 'Français', nl: 'Nederlands', en: 'English' };

interface Category {
  id: string;
  translations: Record<string, string>;
}

export default function MenuItemForm({ itemId }: { itemId?: string }) {
  const [activeTab, setActiveTab] = useState<(typeof locales)[number]>('fr');
  const [translations, setTranslations] = useState<
    Record<string, { name: string; description: string }>
  >({
    fr: { name: '', description: '' },
    nl: { name: '', description: '' },
  });
  const [categoryId, setCategoryId] = useState('');
  const [num, setNum] = useState('');
  const [priceRestaurant, setPriceRestaurant] = useState('');
  const [priceTakeaway, setPriceTakeaway] = useState('');
  const [active, setActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState('0');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/menu')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
      });

    if (itemId) {
      fetch(`/api/admin/menu/${itemId}`)
        .then((r) => r.json())
        .then((data) => {
          setCategoryId(data.category_id || '');
          setNum(data.num || '');
          setPriceRestaurant(String(data.price_restaurant || ''));
          setPriceTakeaway(data.price_takeaway ? String(data.price_takeaway) : '');
          setActive(data.active !== false);
          setIsFeatured(data.is_featured || false);
          setSortOrder(String(data.sort_order || 0));
          if (data.translations) {
            setTranslations((prev) => ({ ...prev, ...data.translations }));
          }
        });
    }
  }, [itemId]);

  function updateTranslation(loc: string, field: 'name' | 'description', value: string) {
    setTranslations((prev) => ({
      ...prev,
      [loc]: { ...prev[loc], [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      category_id: categoryId,
      num: num || null,
      price_restaurant: parseFloat(priceRestaurant) || 0,
      price_takeaway: priceTakeaway ? parseFloat(priceTakeaway) : null,
      active,
      is_featured: isFeatured,
      sort_order: parseInt(sortOrder) || 0,
      translations,
    };

    try {
      const url = itemId ? `/api/admin/menu/${itemId}` : '/api/admin/menu';
      const method = itemId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success || data.id) {
        router.push('/admin/menu');
      } else {
        setError(data.error || 'Save failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-3 py-2 rounded text-sm">{error}</div>
      )}

      <div>
        <div className="flex gap-1 mb-3">
          {locales.map((loc) => (
            <button key={loc} type="button" onClick={() => setActiveTab(loc)}
              className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
                activeTab === loc ? 'bg-surface text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text'
              }`}>
              {localeLabels[loc]}
            </button>
          ))}
        </div>
        <div className="bg-surface rounded-b rounded-r p-4 space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Name ({activeTab.toUpperCase()})</label>
            <input type="text" value={translations[activeTab]?.name || ''} onChange={(e) => updateTranslation(activeTab, 'name', e.target.value)}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description ({activeTab.toUpperCase()})</label>
            <textarea value={translations[activeTab]?.description || ''} onChange={(e) => updateTranslation(activeTab, 'description', e.target.value)} rows={2}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-y" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent">
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.translations.fr || cat.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Item Number</label>
          <input type="text" value={num} onChange={(e) => setNum(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" placeholder="e.g. D1" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Price (Restaurant)</label>
          <input type="number" step="0.01" value={priceRestaurant} onChange={(e) => setPriceRestaurant(e.target.value)} required
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Price (Takeaway)</label>
          <input type="number" step="0.01" value={priceTakeaway} onChange={(e) => setPriceTakeaway(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Sort Order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-accent" />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-accent" />
          Featured
        </label>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="bg-accent text-bg px-6 py-2 rounded font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : itemId ? 'Update Item' : 'Create Item'}
        </button>
        <button type="button" onClick={() => router.push('/admin/menu')}
          className="border border-border text-text-muted px-6 py-2 rounded text-sm hover:text-text transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
