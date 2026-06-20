import { createPublicClient } from './supabase-server';
import { hashToken } from './utils';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Verify and consume an OTP code for the given email.
 * Returns { valid: true } on success, or { valid: false, reason: 'invalid' | 'expired' | 'locked' } on failure.
 * Increments attempt count and locks after OTP_MAX_ATTEMPTS failed tries.
 */
export async function consumeOtp(email: string, code: string): Promise<
  { valid: true } | { valid: false; reason: 'invalid' | 'expired' | 'locked' }
> {
  const supabase = createPublicClient();
  const codeHash = hashToken(code.toLowerCase());

  const { data: otps } = await supabase
    .from('imperial_otps')
    .select('id, code_hash, expires_at, used, attempts')
    .eq('email', email)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1);

  const otp = otps?.[0];
  if (!otp) return { valid: false, reason: 'invalid' };

  // Check attempt lockout
  if (otp.attempts != null && otp.attempts >= OTP_MAX_ATTEMPTS) {
    await supabase.from('imperial_otps').update({ used: true }).eq('id', otp.id);
    return { valid: false, reason: 'locked' };
  }

  // Compare hashed code
  if (!otp.code_hash || otp.code_hash !== codeHash) {
    // Increment attempts
    await supabase
      .from('imperial_otps')
      .update({ attempts: (otp.attempts || 0) + 1 })
      .eq('id', otp.id);
    return { valid: false, reason: 'invalid' };
  }

  if (new Date(otp.expires_at) < new Date()) {
    await supabase.from('imperial_otps').update({ used: true }).eq('id', otp.id);
    return { valid: false, reason: 'expired' };
  }

  await supabase.from('imperial_otps').update({ used: true }).eq('id', otp.id);
  return { valid: true };
}
