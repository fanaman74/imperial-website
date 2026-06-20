# User Auth & Order History — Design Spec

**Date:** 2026-06-20
**Status:** Approved

## Overview

Add Google and Facebook OAuth sign-in for customers. Signed-in users skip OTP verification at checkout and can view their takeaway order and reservation history on a dedicated `/account` page.

The existing custom admin auth (`imperial_admin_sessions`, `IMPERIAL_ADMIN_PASSWORD`) is completely separate and untouched.

---

## Auth Strategy

**Supabase Auth** with OAuth providers (Google, Facebook).

- Google and Facebook are enabled as OAuth providers in the Supabase dashboard
- `@supabase/ssr` replaces the bare `createClient` calls for session-aware server/client access
- A new middleware layer wraps the existing rate-limit middleware to refresh the Supabase session cookie on every request
- OAuth callback is handled by `app/auth/callback/route.ts`

---

## Database Changes

Two migrations:

1. Add `user_id uuid references auth.users(id) on delete set null` (nullable) to `imperial_orders`
2. Add `user_id uuid references auth.users(id) on delete set null` (nullable) to `imperial_reservations`

Existing rows remain valid with `user_id = null`. History only shows rows placed while signed in — no retroactive email-based linking (avoids privacy risk).

**New RLS policies:**
- Users can `SELECT` their own orders: `auth.uid() = user_id`
- Users can `SELECT` their own reservations: `auth.uid() = user_id`
- Existing public INSERT policies remain unchanged

---

## Sign-in Flow

1. User clicks "Sign in" (navbar or checkout prompt)
2. `SignInModal` opens with Google and Facebook buttons
3. `supabase.auth.signInWithOAuth({ provider, redirectTo: currentUrl })` triggers redirect to provider
4. Provider redirects to `app/auth/callback/route.ts`, which exchanges the code for a session cookie, then redirects back to the origin page
5. Session cookie is set; all server components read it via the `@supabase/ssr` client

**Facebook edge case:** If Facebook returns a user with no verified email, sign-in fails with: "Please use Google, or sign in with your email code instead."

---

## OTP Skip Logic

`ClientHomePage` is a `'use client'` component — the session is read client-side via `supabase.auth.getUser()` on mount, stored as `user` state, and passed as a prop to `TakeawayPanel` and `Reservation`.

- If `user` is present: skip OTP step, pre-fill name/email (read-only), submit order/reservation directly with `user_id` attached
- If `user` is absent: existing OTP flow unchanged

The API routes (`/api/reservation`, `/api/otp/...`) independently verify the session from cookies server-side:
- If a valid Supabase session is present in cookies → OTP is not required, `user_id` is written to the row
- If no session → OTP code is required as before

Pre-fill behaviour for signed-in users: name and email fields are read-only (from Supabase profile), phone and special requests remain editable.

---

## UI Components

### `components/UserButton.tsx` (client)
- Shown in Navbar
- Signed out: "Sign in" text button → opens `SignInModal`
- Signed in: shows user avatar (or initials) + first name, dropdown with "My account" link and "Sign out"
- Sign out calls `supabase.auth.signOut()` and refreshes the page

### `components/SignInModal.tsx` (client)
- Overlay modal with Google button and Facebook button
- On OAuth error (callback returns `?error=`): shows "Sign in failed, please try again"
- Triggered by: `UserButton`, checkout OTP step prompt

### Checkout sign-in prompt
- Rendered above the OTP step in `TakeawayPanel` and `Reservation` when user is not signed in
- Text: "Sign in to skip email verification" with Google and Facebook buttons
- OTP option remains available below as fallback ("Or continue with email code")

### `app/auth/callback/route.ts`
- Exchanges OAuth code for session, sets cookie
- On error: redirects to origin with `?error=auth_failed`
- On success: redirects to `redirectTo` param (the page the user came from)

### `app/account/page.tsx` (server component)
- Reads session; if none, redirects to `/?signin=1` (which triggers `SignInModal` to open)
- Fetches `imperial_orders` and `imperial_reservations` where `user_id = auth.uid()`
- Two tabs: **Orders** and **Reservations**
  - Each row: date, status badge, summary (items/guests count)
  - Empty state per tab: "No orders yet" / "No reservations yet" with link to relevant page
- Sign-out button (client component)

### `lib/supabase-ssr.ts`
- Exports `createBrowserClient()` and `createServerClient()` using `@supabase/ssr`
- Replaces the existing `lib/supabase-browser.ts` and the non-admin usage of `lib/supabase-server.ts`
- The admin `createServerClient` (service-role key) remains in `lib/supabase-server.ts` under `createAdminClient`

---

## Middleware Update

`middleware.ts` gains a first step: call `supabase.auth.getSession()` using `@supabase/ssr`'s `createServerClient` with the request/response cookies to refresh the session token if needed. Then continues to the existing rate-limit logic.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| User cancels OAuth at provider | `/auth/callback` gets `?error=` → redirects back → `SignInModal` shows retry message |
| Session expires mid-session | Middleware refresh fails → user treated as signed out, OTP required again at checkout |
| Facebook returns no email | Sign-in rejected with clear message |
| Account page, no orders yet | Empty state with link to takeaway/reservation page |
| Signed in at checkout, API session invalid | Falls back to requiring OTP (defensive) |

---

## New Files

| File | Purpose |
|------|---------|
| `app/auth/callback/route.ts` | OAuth code exchange + redirect |
| `app/account/page.tsx` | Order/reservation history (server component) |
| `components/UserButton.tsx` | Navbar sign-in/avatar |
| `components/SignInModal.tsx` | Google + Facebook buttons modal |
| `lib/supabase-ssr.ts` | Session-aware Supabase clients via `@supabase/ssr` |
| `supabase/migrations/20260620_add_user_id.sql` | DB migration |

## Modified Files

| File | Change |
|------|--------|
| `middleware.ts` | Add session refresh step before rate limiting |
| `components/Navbar.tsx` | Add `UserButton` |
| `components/TakeawayPanel.tsx` | Accept `user` prop, skip OTP if signed in, add sign-in prompt |
| `components/Reservation.tsx` | Accept `user` prop, skip OTP if signed in, add sign-in prompt |
| `app/takeaway/page.tsx` | Pass `user` prop through to `TakeawayPage` |
| `components/ClientHomePage.tsx` | Read session client-side on mount, pass `user` to `Reservation` and `TakeawayPanel`, handle `?signin=1` to auto-open `SignInModal` |
| `app/api/reservation/route.ts` | Accept session as OTP alternative, write `user_id` |
| `app/api/otp/send/route.ts` | No-op if valid session present |
| `lib/supabase-browser.ts` | Replaced by `lib/supabase-ssr.ts` |
| `package.json` | Add `@supabase/ssr` |
