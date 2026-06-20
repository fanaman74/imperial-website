import { createPublicClient } from './supabase-server';
import type { Locale } from './i18n/config';

interface CategoryRow {
  id: string;
  sort_order: number;
}

interface CategoryTranslationRow {
  category_id: string;
  name: string;
}

interface ItemRow {
  id: string;
  category_id: string;
  num: string | null;
  price_restaurant: number | string;
  price_takeaway: number | string | null;
  is_featured: boolean;
  featured_image: string | null;
  sort_order: number;
}

interface ItemTranslationRow {
  item_id: string;
  name: string;
  description: string;
}

interface FeaturedItemRow {
  id: string;
  price_restaurant: number | string;
  featured_image: string | null;
}

export async function getMenuData(locale: string) {
  const supabase = createPublicClient();

  // Parallelize all queries instead of sequential awaits
  const [categoriesRes, catTransRes, itemsRes, itemTransRes] = await Promise.all([
    supabase.from('imperial_categories').select('id, sort_order').order('sort_order'),
    supabase.from('imperial_category_translations').select('category_id, name').eq('locale', locale),
    supabase.from('imperial_items').select('id, category_id, num, price_restaurant, price_takeaway, is_featured, featured_image, sort_order').eq('active', true).order('sort_order'),
    supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', locale),
  ]);

  const categories = (categoriesRes.data || []) as CategoryRow[];
  const catTrans = (catTransRes.data || []) as CategoryTranslationRow[];
  const items = (itemsRes.data || []) as ItemRow[];
  const itemTrans = (itemTransRes.data || []) as ItemTranslationRow[];

  const catMap = Object.fromEntries(catTrans.map(t => [t.category_id, t.name]));
  const itemMap = Object.fromEntries(itemTrans.map(t => [t.item_id, { name: t.name, description: t.description }]));

  // Fetch French fallback translations only if locale isn't French
  let catMapFr: Record<string, string> = {};
  let itemMapFr: Record<string, { name: string; description: string }> = {};
  if (locale !== 'fr') {
    const [catTransFrRes, itemTransFrRes] = await Promise.all([
      supabase.from('imperial_category_translations').select('category_id, name').eq('locale', 'fr'),
      supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', 'fr'),
    ]);
    catMapFr = Object.fromEntries(((catTransFrRes.data || []) as CategoryTranslationRow[]).map(t => [t.category_id, t.name]));
    itemMapFr = Object.fromEntries(((itemTransFrRes.data || []) as ItemTranslationRow[]).map(t => [t.item_id, { name: t.name, description: t.description }]));
  }

  return categories.map(c => ({
    id: c.id,
    name: catMap[c.id] || catMapFr[c.id] || '',
    items: items.filter(i => i.category_id === c.id).map(i => ({
      id: i.id,
      num: i.num || '',
      name: itemMap[i.id]?.name || itemMapFr[i.id]?.name || '',
      description: itemMap[i.id]?.description || itemMapFr[i.id]?.description || '',
      priceRestaurant: Number(i.price_restaurant),
      priceTakeaway: i.price_takeaway ? Number(i.price_takeaway) : null,
    })),
  }));
}

export async function getFeaturedDishes(locale: string) {
  const supabase = createPublicClient();
  const { data: itemsData } = await supabase.from('imperial_items').select('id, price_restaurant, featured_image').eq('is_featured', true).eq('active', true);
  const items = (itemsData || []) as FeaturedItemRow[];
  const ids = items.map(i => i.id);
  if (ids.length === 0) return [];

  const [transRes, transFrRes] = await Promise.all([
    supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', locale).in('item_id', ids),
    locale !== 'fr'
      ? supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', 'fr').in('item_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const trans = (transRes.data || []) as ItemTranslationRow[];
  const transFr = (transFrRes.data || []) as ItemTranslationRow[];
  const tMap = Object.fromEntries(trans.map(t => [t.item_id, t]));
  const tMapFr = Object.fromEntries(transFr.map(t => [t.item_id, t]));

  return items.map(i => ({
    id: i.id,
    name: tMap[i.id]?.name || tMapFr[i.id]?.name || '',
    description: tMap[i.id]?.description || tMapFr[i.id]?.description || '',
    price: Number(i.price_restaurant),
    image: i.featured_image,
  }));
}
