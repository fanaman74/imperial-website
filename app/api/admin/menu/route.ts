import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';

async function checkAuth(req: NextRequest) {
  const token = req.cookies.get('imperial_admin_token')?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const supabase = createServerClient();

  const { data: items } = await supabase
    .from('imperial_items')
    .select('id, category_id, num, price_restaurant, price_takeaway, active, is_featured, featured_image, sort_order')
    .order('sort_order');

  const { data: translations } = await supabase
    .from('imperial_item_translations')
    .select('item_id, locale, name, description');

  const { data: categories } = await supabase
    .from('imperial_categories')
    .select('id, sort_order')
    .order('sort_order');

  const { data: catTrans } = await supabase
    .from('imperial_category_translations')
    .select('category_id, locale, name');

  const transMap: Record<string, Record<string, { name: string; description: string }>> = {};
  for (const t of translations || []) {
    if (!transMap[t.item_id]) transMap[t.item_id] = {};
    transMap[t.item_id][t.locale] = { name: t.name, description: t.description };
  }

  const catTransMap: Record<string, Record<string, string>> = {};
  for (const t of catTrans || []) {
    if (!catTransMap[t.category_id]) catTransMap[t.category_id] = {};
    catTransMap[t.category_id][t.locale] = t.name;
  }

  const result = (items || []).map(item => ({
    ...item,
    translations: transMap[item.id] || {},
  }));

  return NextResponse.json({
    items: result,
    categories: (categories || []).map(c => ({
      ...c,
      translations: catTransMap[c.id] || {},
    })),
  });
}

export async function POST(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { category_id, num, price_restaurant, price_takeaway, active, is_featured, featured_image, sort_order, translations } = body;

    const supabase = createServerClient();

    const { data: item, error } = await supabase
      .from('imperial_items')
      .insert({
        category_id,
        num: num || null,
        price_restaurant: price_restaurant || 0,
        price_takeaway: price_takeaway || null,
        active: active !== false,
        is_featured: is_featured || false,
        featured_image: featured_image || null,
        sort_order: sort_order || 0,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (translations) {
      const transRows = Object.entries(translations).map(([locale, t]: [string, any]) => ({
        item_id: item.id,
        locale,
        name: t.name || '',
        description: t.description || '',
      }));
      if (transRows.length > 0) {
        const { error: transError } = await supabase
          .from('imperial_item_translations')
          .insert(transRows);
        if (transError) return NextResponse.json({ error: transError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, id: item.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
