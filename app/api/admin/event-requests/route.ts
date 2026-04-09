import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('imperial_admin_token')?.value;
  return token && (await verifyAdminSession(token));
}

export async function PUT(req: NextRequest) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, status } = await req.json();
  const supabase = createServerClient();
  const { error } = await supabase.from('imperial_event_requests').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
