import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkAuth } from '@/lib/admin-auth';
import { menuItemSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const { itemId } = await params;
    const supabase = createServerClient();

    const [itemRes, translationsRes] = await Promise.all([
      supabase.from('imperial_items').select('*').eq('id', itemId).single(),
      supabase.from('imperial_item_translations').select('locale, name, description').eq('item_id', itemId),
    ]);

    if (!itemRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const transMap: Record<string, { name: string; description: string }> = {};
    for (const t of translationsRes.data || []) {
      transMap[t.locale] = { name: t.name, description: t.description };
    }

    return NextResponse.json({ ...itemRes.data, translations: transMap });
  } catch (e) {
    console.error('Menu item GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const { itemId } = await params;
    const body = await req.json();
    const parsed = menuItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { category_id, num, price_restaurant, price_takeaway, active, is_featured, featured_image, sort_order, translations } = parsed.data;

    const supabase = createServerClient();

    const { error } = await supabase
      .from('imperial_items')
      .update({
        category_id,
        num: num ?? null,
        price_restaurant: price_restaurant != null ? Number(price_restaurant) : 0,
        price_takeaway: price_takeaway != null ? Number(price_takeaway) : null,
        active: active !== false,
        is_featured: is_featured || false,
        featured_image: featured_image || null,
        sort_order: sort_order != null ? Number(sort_order) : 0,
      })
      .eq('id', itemId);

    if (error) {
      console.error('Menu item update error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (translations) {
      // Batch upsert all translations in a single query
      const transRows = Object.entries(translations).map(([locale, t]) => ({
        item_id: itemId,
        locale,
        name: t.name || '',
        description: t.description || '',
      }));
      if (transRows.length > 0) {
        const { error: transError } = await supabase
          .from('imperial_item_translations')
          .upsert(transRows, { onConflict: 'item_id,locale' });
        if (transError) {
          console.error('Translation upsert error:', transError);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Menu item PUT error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const { itemId } = await params;
    const supabase = createServerClient();

    await supabase.from('imperial_item_translations').delete().eq('item_id', itemId);
    const { error } = await supabase.from('imperial_items').delete().eq('id', itemId);

    if (error) {
      console.error('Menu item delete error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Menu item DELETE error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
