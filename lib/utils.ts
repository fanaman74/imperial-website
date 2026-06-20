import { createHash, timingSafeEqual } from 'crypto';

/**
 * Escape user-controlled text for safe interpolation into HTML email bodies.
 * Prevents HTML/script injection in transactional emails.
 */
export function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Hash a token (OTP code or session token) with SHA-256 for secure storage.
 * Returns a hex string. The plaintext is never stored in the database.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks on password/token checks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
