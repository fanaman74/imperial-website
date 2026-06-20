import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from './supabase-server';
import { hashToken, timingSafeCompare } from './utils';

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Verify an admin session token against the database.
 * The token is hashed before comparison — plaintext is never stored.
 */
export async function verifyAdminSession(token: string): Promise<boolean> {
  if (!token) return false;
  const supabase = createServerClient();
  const tokenHash = hashToken(token);
  const { data } = await supabase
    .from('imperial_admin_sessions')
    .select('id, token_hash, expires_at')
    .eq('token_hash', tokenHash)
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}

/**
 * Shared auth check for admin API routes using NextRequest cookies.
 * Returns a NextResponse (401) on failure, or null on success.
 */
export async function checkAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get('imperial_admin_token')?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Verify admin password using constant-time comparison to prevent timing attacks.
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.IMPERIAL_ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return timingSafeCompare(password, adminPassword);
}
