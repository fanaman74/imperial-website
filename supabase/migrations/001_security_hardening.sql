-- Migration: Security hardening (Phase 1 code review)
-- Run this in the Supabase SQL Editor after deploying the updated code.
-- This migration adds columns for hashed OTP codes/session tokens and brute-force tracking.

-- 1. OTP table: store hashed code instead of plaintext, add attempt counter
-- The code_hash column stores SHA-256(otp_code) so plaintext codes are never in the DB.
ALTER TABLE imperial_otps ADD COLUMN IF NOT EXISTS code_hash text;
ALTER TABLE imperial_otps ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;

-- Optionally drop the old plaintext code column after confirming the new code works:
-- ALTER TABLE imperial_otps DROP COLUMN IF EXISTS code;

-- 2. Admin sessions: store hashed token instead of plaintext
ALTER TABLE imperial_admin_sessions ADD COLUMN IF NOT EXISTS token_hash text;

-- Optionally drop the old plaintext token column:
-- ALTER TABLE imperial_admin_sessions DROP COLUMN IF EXISTS token;

-- 3. Recommended indexes for query performance
CREATE INDEX IF NOT EXISTS idx_imperial_otps_email_used_created
  ON imperial_otps (email, used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_imperial_admin_sessions_token_hash
  ON imperial_admin_sessions (token_hash);

CREATE INDEX IF NOT EXISTS idx_imperial_items_category_active_sort
  ON imperial_items (category_id, active, sort_order);

CREATE INDEX IF NOT EXISTS idx_imperial_item_translations_item_locale
  ON imperial_item_translations (item_id, locale);

CREATE INDEX IF NOT EXISTS idx_imperial_category_translations_cat_locale
  ON imperial_category_translations (category_id, locale);

CREATE INDEX IF NOT EXISTS idx_imperial_reservations_created
  ON imperial_reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_imperial_orders_created
  ON imperial_orders (created_at DESC);

-- 4. Clean up expired admin sessions (run periodically via a Supabase scheduled function)
-- DELETE FROM imperial_admin_sessions WHERE expires_at < NOW();
