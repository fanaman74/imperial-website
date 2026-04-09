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
  const { data, error } = await supabase
    .from('imperial_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('imperial_orders').update({ status }).eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
