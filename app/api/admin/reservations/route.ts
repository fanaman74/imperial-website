import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkAuth } from '@/lib/admin-auth';
import { statusUpdateSchema, RESERVATION_STATUSES } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const supabase = createServerClient();
    const { data, error, count } = await supabase
      .from('imperial_reservations')
      .select('id, guests, date, time, first_name, last_name, email, phone, special_requests, locale, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Reservations fetch error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json({ data, total: count, page, pageSize });
  } catch (e) {
    console.error('Reservations GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { id, status } = parsed.data;

    if (!RESERVATION_STATUSES.includes(status as typeof RESERVATION_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('imperial_reservations').update({ status }).eq('id', id);

    if (error) {
      console.error('Reservation update error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Reservation PATCH error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
