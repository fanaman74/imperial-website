import { createServerClient } from './supabase-server';

export async function getMenuData(locale: string) {
  const supabase = createServerClient();

  const { data: categories } = await supabase.from('imperial_categories').select('id, sort_order').order('sort_order');
  const { data: catTrans } = await supabase.from('imperial_category_translations').select('category_id, name').eq('locale', locale);
  const { data: catTransFr } = locale !== 'fr' ? await supabase.from('imperial_category_translations').select('category_id, name').eq('locale', 'fr') : { data: null };
  const { data: items } = await supabase.from('imperial_items').select('id, category_id, num, price_restaurant, price_takeaway, is_featured, featured_image, sort_order').eq('active', true).order('sort_order');
  const { data: itemTrans } = await supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', locale);
  const { data: itemTransFr } = locale !== 'fr' ? await supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', 'fr') : { data: null };

  const catMap = Object.fromEntries((catTrans || []).map(t => [t.category_id, t.name]));
  const catMapFr = Object.fromEntries((catTransFr || []).map(t => [t.category_id, t.name]));
  const itemMap = Object.fromEntries((itemTrans || []).map(t => [t.item_id, { name: t.name, description: t.description }]));
  const itemMapFr = Object.fromEntries((itemTransFr || []).map(t => [t.item_id, { name: t.name, description: t.description }]));

  return (categories || []).map(c => ({
    id: c.id,
    name: catMap[c.id] || catMapFr[c.id] || '',
    items: (items || []).filter(i => i.category_id === c.id).map(i => ({
      id: i.id,
      num: i.num,
      name: itemMap[i.id]?.name || itemMapFr[i.id]?.name || '',
      description: itemMap[i.id]?.description || itemMapFr[i.id]?.description || '',
      priceRestaurant: Number(i.price_restaurant),
      priceTakeaway: i.price_takeaway ? Number(i.price_takeaway) : null,
    })),
  }));
}

export async function getFeaturedDishes(locale: string) {
  const supabase = createServerClient();
  const { data: items } = await supabase.from('imperial_items').select('id, price_restaurant, featured_image').eq('is_featured', true).eq('active', true);
  const ids = (items || []).map(i => i.id);
  if (ids.length === 0) return [];
  const { data: trans } = await supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', locale).in('item_id', ids);
  const { data: transFr } = locale !== 'fr' ? await supabase.from('imperial_item_translations').select('item_id, name, description').eq('locale', 'fr').in('item_id', ids) : { data: null };
  const tMap = Object.fromEntries((trans || []).map(t => [t.item_id, t]));
  const tMapFr = Object.fromEntries((transFr || []).map(t => [t.item_id, t]));
  return (items || []).map(i => ({
    id: i.id,
    name: tMap[i.id]?.name || tMapFr[i.id]?.name || '',
    description: tMap[i.id]?.description || tMapFr[i.id]?.description || '',
    price: Number(i.price_restaurant),
    image: i.featured_image,
  }));
}
