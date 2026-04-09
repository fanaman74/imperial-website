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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const { itemId } = await params;
  const supabase = createServerClient();

  const { data: item } = await supabase.from('imperial_items').select('*').eq('id', itemId).single();
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: translations } = await supabase.from('imperial_item_translations').select('locale, name, description').eq('item_id', itemId);

  const transMap: Record<string, { name: string; description: string }> = {};
  for (const t of translations || []) {
    transMap[t.locale] = { name: t.name, description: t.description };
  }

  return NextResponse.json({ ...item, translations: transMap });
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
    const { category_id, num, price_restaurant, price_takeaway, active, is_featured, featured_image, sort_order, translations } = body;

    const supabase = createServerClient();

    const { error } = await supabase
      .from('imperial_items')
      .update({
        category_id,
        num: num || null,
        price_restaurant: price_restaurant || 0,
        price_takeaway: price_takeaway || null,
        active: active !== false,
        is_featured: is_featured || false,
        featured_image: featured_image || null,
        sort_order: sort_order || 0,
      })
      .eq('id', itemId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (translations) {
      for (const [locale, t] of Object.entries(translations) as [string, any][]) {
        await supabase
          .from('imperial_item_translations')
          .upsert(
            { item_id: itemId, locale, name: t.name || '', description: t.description || '' },
            { onConflict: 'item_id,locale' }
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
