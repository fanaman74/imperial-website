import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password !== process.env.IMPERIAL_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const supabase = createServerClient();
    await supabase.from('imperial_admin_sessions').insert({
      token,
      expires_at: expiresAt.toISOString(),
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set('imperial_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
