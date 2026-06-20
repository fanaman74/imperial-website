import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { hashToken } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('imperial_admin_token')?.value;

    if (token) {
      const supabase = createServerClient();
      const tokenHash = hashToken(token);
      await supabase.from('imperial_admin_sessions').delete().eq('token_hash', tokenHash);
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('imperial_admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    return res;
  } catch (e) {
    console.error('Admin logout error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
