import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Public client — uses the anon key. Used for public-facing reads (menu) and
 * customer writes (reservations, orders, OTPs, event requests).
 * RLS policies should be configured in Supabase to allow these operations.
 */
let publicClient: SupabaseClient | null = null;

export function createPublicClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return publicClient;
}

/**
 * Admin client — uses the service-role key (bypasses RLS).
 * Reserved for admin routes only. Falls back to anon key if service-role key
 * is absent (dev environments without the key).
 */
let adminClient: SupabaseClient | null = null;

export function createServerClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return adminClient;
}

/** Alias for clarity in admin routes. */
export const createAdminClient = createServerClient;
