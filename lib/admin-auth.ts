import { createServerClient } from './supabase-server';

export async function verifyAdminSession(token: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('imperial_admin_sessions')
    .select('id, expires_at')
    .eq('token', token)
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}
