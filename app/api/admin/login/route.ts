import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { verifyAdminPassword } from '@/lib/admin-auth';
import { adminLoginSchema } from '@/lib/validation';
import { hashToken } from '@/lib/utils';
import { randomUUID } from 'crypto';
import { SESSION_TTL_MS } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { password } = parsed.data;

    // Constant-time password comparison (prevents timing attacks)
    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = randomUUID();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const supabase = createServerClient();
    const { error: insertError } = await supabase.from('imperial_admin_sessions').insert({
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('Session insert failed:', insertError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('imperial_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
    return res;
  } catch (e) {
    console.error('Admin login error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
