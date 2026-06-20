import { describe, it, expect } from 'vitest';
import { escapeHtml, hashToken, timingSafeCompare } from '../utils';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('converts non-strings to string then escapes', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('hashToken', () => {
  it('produces a consistent hex hash', () => {
    const hash1 = hashToken('test-token');
    const hash2 = hashToken('test-token');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });
});

describe('timingSafeCompare', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeCompare('password123', 'password123')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(timingSafeCompare('password123', 'password456')).toBe(false);
  });

  it('returns false for different-length strings', () => {
    expect(timingSafeCompare('short', 'longer-string')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(timingSafeCompare('', '')).toBe(true);
  });
});
