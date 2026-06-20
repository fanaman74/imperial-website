import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkAuth } from '@/lib/admin-auth';
import { menuItemSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const supabase = createServerClient();

    // Parallelize all 4 queries instead of sequential awaits
    const [itemsRes, translationsRes, categoriesRes, catTransRes] = await Promise.all([
      supabase
        .from('imperial_items')
        .select('id, category_id, num, price_restaurant, price_takeaway, active, is_featured, featured_image, sort_order')
        .order('sort_order'),
      supabase
        .from('imperial_item_translations')
        .select('item_id, locale, name, description'),
      supabase
        .from('imperial_categories')
        .select('id, sort_order')
        .order('sort_order'),
      supabase
        .from('imperial_category_translations')
        .select('category_id, locale, name'),
    ]);

    const items = itemsRes.data || [];
    const translations = translationsRes.data || [];
    const categories = categoriesRes.data || [];
    const catTrans = catTransRes.data || [];

    const transMap: Record<string, Record<string, { name: string; description: string }>> = {};
    for (const t of translations) {
      if (!transMap[t.item_id]) transMap[t.item_id] = {};
      transMap[t.item_id][t.locale] = { name: t.name, description: t.description };
    }

    const catTransMap: Record<string, Record<string, string>> = {};
    for (const t of catTrans) {
      if (!catTransMap[t.category_id]) catTransMap[t.category_id] = {};
      catTransMap[t.category_id][t.locale] = t.name;
    }

    const result = items.map(item => ({
      ...item,
      translations: transMap[item.id] || {},
    }));

    return NextResponse.json({
      items: result,
      categories: categories.map(c => ({
        ...c,
        translations: catTransMap[c.id] || {},
      })),
    });
  } catch (e) {
    console.error('Admin menu GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = menuItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { category_id, num, price_restaurant, price_takeaway, active, is_featured, featured_image, sort_order, translations } = parsed.data;

    const supabase = createServerClient();

    const { data: item, error } = await supabase
      .from('imperial_items')
      .insert({
        category_id,
        num: num ?? null,
        price_restaurant: price_restaurant != null ? Number(price_restaurant) : 0,
        price_takeaway: price_takeaway != null ? Number(price_takeaway) : null,
        active: active !== false,
        is_featured: is_featured || false,
        featured_image: featured_image || null,
        sort_order: sort_order != null ? Number(sort_order) : 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Menu item insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (translations) {
      const transRows = Object.entries(translations).map(([locale, t]) => ({
        item_id: item.id,
        locale,
        name: t.name || '',
        description: t.description || '',
      }));
      if (transRows.length > 0) {
        const { error: transError } = await supabase
          .from('imperial_item_translations')
          .insert(transRows);
        if (transError) {
          console.error('Translation insert error:', transError);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, id: item.id });
  } catch (e) {
    console.error('Menu item POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
