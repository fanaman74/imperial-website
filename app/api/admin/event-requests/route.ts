import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkAuth } from '@/lib/admin-auth';
import { statusUpdateSchema, EVENT_REQUEST_STATUSES } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('imperial_event_requests')
      .select('id, first_name, last_name, email, phone, event_type, event_date, guests, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Event requests fetch error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('Event requests GET error:', e);
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

    if (!EVENT_REQUEST_STATUSES.includes(status as typeof EVENT_REQUEST_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('imperial_event_requests').update({ status }).eq('id', id);

    if (error) {
      console.error('Event request update error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Event request PATCH error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
