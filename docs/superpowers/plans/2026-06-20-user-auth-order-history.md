# User Auth & Order History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google and Facebook OAuth sign-in for customers, skip OTP for signed-in users at checkout, and show order/reservation history at `/account`.

**Architecture:** Supabase Auth with `@supabase/ssr` for session-aware clients; `UserProvider` React context distributes the session to all client components; new `/api/order` route handles authenticated order creation without OTP; `/api/reservation` updated to accept a valid session in place of an OTP code.

**Tech Stack:** `@supabase/ssr`, Supabase Auth OAuth providers (Google, Facebook), Next.js App Router, Tailwind CSS, Zod

---

## File Map

| Action | File |
|--------|------|
| Create | `lib/supabase-ssr.ts` |
| Create | `supabase/migrations/20260620_add_user_id.sql` |
| Create | `app/auth/callback/route.ts` |
| Create | `components/UserProvider.tsx` |
| Create | `components/SignInModal.tsx` |
| Create | `components/UserButton.tsx` |
| Create | `app/api/order/route.ts` |
| Create | `app/account/page.tsx` |
| Modify | `lib/validation.ts` — add `authenticatedOrderSchema`, `authenticatedReservationSchema` |
| Modify | `middleware.ts` — add session refresh step |
| Modify | `app/layout.tsx` — wrap with `UserProvider` |
| Modify | `components/Navbar.tsx` — add `UserButton` |
| Modify | `app/api/reservation/route.ts` — accept session as OTP alternative |
| Modify | `components/TakeawayPanel.tsx` — skip OTP for signed-in users |
| Modify | `components/Reservation.tsx` — skip OTP for signed-in users |
| Modify | `components/ClientHomePage.tsx` — handle `?signin=1` URL param |

---

### Task 1: Install `@supabase/ssr` and create session-aware Supabase client

**Files:**
- Create: `lib/supabase-ssr.ts`
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @supabase/ssr
```

Expected output: package added to `node_modules`, `package-lock.json` updated.

- [ ] **Step 2: Create `lib/supabase-ssr.ts`**

```ts
import {
  createBrowserClient as createSSRBrowserClient,
  createServerClient as createSSRServerClient,
} from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function createUserServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase-ssr.ts package.json package-lock.json
git commit -m "feat: add @supabase/ssr session-aware client"
```

---

### Task 2: Database migration — add `user_id` columns and RLS policies

**Files:**
- Create: `supabase/migrations/20260620_add_user_id.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add user_id to imperial_orders
ALTER TABLE imperial_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add user_id to imperial_reservations
ALTER TABLE imperial_reservations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS: users can read their own orders
CREATE POLICY "Users can read own orders"
  ON imperial_orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: users can read their own reservations
CREATE POLICY "Users can read own reservations"
  ON imperial_reservations
  FOR SELECT
  USING (auth.uid() = user_id);
```

Save to `supabase/migrations/20260620_add_user_id.sql`.

- [ ] **Step 2: Apply the migration in Supabase dashboard**

Open Supabase dashboard → SQL Editor → paste and run the migration. Verify the columns exist in the Table Editor.

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/20260620_add_user_id.sql
git commit -m "feat: add user_id columns and RLS policies for order history"
```

---

### Task 3: Add validation schemas for authenticated requests

**Files:**
- Modify: `lib/validation.ts`

- [ ] **Step 1: Write failing tests**

In `lib/validation.test.ts`, add after the existing tests:

```ts
import { authenticatedOrderSchema, authenticatedReservationSchema } from './validation';

describe('authenticatedOrderSchema', () => {
  it('accepts valid order without code', () => {
    const result = authenticatedOrderSchema.safeParse({
      customerName: 'Alice',
      items: [{ id: 'a', name: 'Spring Rolls', quantity: 2, price: 7.5 }],
      total: 15,
    });
    expect(result.success).toBe(true);
  });
  it('rejects empty items', () => {
    const result = authenticatedOrderSchema.safeParse({
      customerName: 'Alice',
      items: [],
      total: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('authenticatedReservationSchema', () => {
  it('accepts valid reservation without code', () => {
    const result = authenticatedReservationSchema.safeParse({
      guests: 2,
      date: '2026-07-01',
      time: '19:00',
      firstName: 'Alice',
      email: 'alice@example.com',
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: `authenticatedOrderSchema` and `authenticatedReservationSchema` not found — FAIL.

- [ ] **Step 3: Add schemas to `lib/validation.ts`**

Add after the `otpVerifySchema` block:

```ts
export const authenticatedOrderSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(30).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
  total: z.number().min(0).max(99999),
});

export const authenticatedReservationSchema = z.object({
  guests: z.number().int().min(1).max(50),
  date: z.string().max(20),
  time: z.string().max(10),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(''),
  phone: z.string().max(30).optional(),
  specialRequests: z.string().max(2000).optional(),
  locale: z.enum(LOCALES).optional(),
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts lib/validation.test.ts
git commit -m "feat: add validation schemas for authenticated checkout"
```

---

### Task 4: Update middleware for session refresh

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Replace the top of `middleware.ts`**

The current `middleware.ts` starts with imports and a rate-limit map. Replace the entire `export function middleware(req: NextRequest)` body to add session refresh as a first step, then continue to rate limiting. The refresh must use the SSR client pattern (not `lib/supabase-ssr.ts` which uses `next/headers` — middleware uses `request.cookies` directly).

Replace:

```ts
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
```

With:

```ts
import { createServerClient } from '@supabase/ssr';
```

Add this import at the top of the file (after the existing `import { NextRequest, NextResponse } from 'next/server';`), then replace the middleware function body:

```ts
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Refresh Supabase Auth session on every request so tokens don't expire
  let response = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) {
    return response;
  }
```

Also update the final `return NextResponse.next()` / rate-limit pass-through lines to use `response` instead of `NextResponse.next()`. Find the two places that return the passing response:

Replace:
```ts
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(entry.resetTime));
  return response;
```
With:
```ts
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(entry.resetTime));
  return response;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: refresh Supabase auth session in middleware"
```

---

### Task 5: Create OAuth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}${next}?error=auth_failed`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}?error=auth_failed`);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add OAuth callback route handler"
```

---

### Task 6: Create `UserProvider` context and add to layout

**Files:**
- Create: `components/UserProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/UserProvider.tsx`**

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase-ssr';

interface UserContextValue {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
```

- [ ] **Step 2: Add `UserProvider` to `app/layout.tsx`**

Add the import:
```ts
import { UserProvider } from '@/components/UserProvider';
```

Wrap `<OrderProvider>` with `<UserProvider>`:
```tsx
<LanguageProvider>
  <ThemeProvider>
    <UserProvider>
      <OrderProvider>
        {children}
      </OrderProvider>
    </UserProvider>
  </ThemeProvider>
</LanguageProvider>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/UserProvider.tsx app/layout.tsx
git commit -m "feat: add UserProvider context for client-side auth state"
```

---

### Task 7: Create `SignInModal` component

**Files:**
- Create: `components/SignInModal.tsx`

- [ ] **Step 1: Create `components/SignInModal.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase-ssr';

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  error?: boolean;
}

export default function SignInModal({ open, onClose, error }: SignInModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function signIn(provider: 'google' | 'facebook') {
    const supabase = createBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-surface rounded-lg p-8 w-full max-w-sm mx-4 space-y-4">
        <h2 className="font-display text-xl italic text-center">Sign in</h2>
        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 rounded px-3 py-2">
            Sign in failed, please try again.
          </p>
        )}
        <button
          onClick={() => signIn('google')}
          className="w-full flex items-center justify-center gap-3 border border-border rounded px-4 py-3 text-sm hover:border-accent transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <button
          onClick={() => signIn('facebook')}
          className="w-full flex items-center justify-center gap-3 border border-border rounded px-4 py-3 text-sm hover:border-accent transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continue with Facebook
        </button>
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-text-muted hover:text-text transition-colors pt-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/SignInModal.tsx
git commit -m "feat: add SignInModal with Google and Facebook OAuth buttons"
```

---

### Task 8: Create `UserButton` and add to Navbar

**Files:**
- Create: `components/UserButton.tsx`
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Create `components/UserButton.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { createBrowserClient } from '@/lib/supabase-ssr';
import SignInModal from '@/components/SignInModal';

export default function UserButton() {
  const { user, loading } = useUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('signin') === '1') {
      setModalOpen(true);
      setModalError(false);
    }
    if (searchParams.get('error') === 'auth_failed') {
      setModalOpen(true);
      setModalError(true);
    }
  }, [searchParams]);

  if (loading) return <div className="w-16 h-5" />;

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.refresh();
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => { setModalError(false); setModalOpen(true); }}
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          Sign in
        </button>
        <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} error={modalError} />
      </>
    );
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : (user.email?.[0]?.toUpperCase() ?? '?');
  const firstName = fullName.split(' ')[0] || user.email?.split('@')[0] || '';

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-text hover:text-accent transition-colors"
        aria-expanded={dropdownOpen}
        aria-label={`Account menu for ${firstName}`}
      >
        <span className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold select-none">
          {initials}
        </span>
        <span className="hidden lg:block">{firstName}</span>
      </button>
      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-2 z-20 bg-surface border border-border rounded shadow-lg py-1 w-44">
            <Link
              href="/account"
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-bg transition-colors"
            >
              My account
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-text hover:bg-bg transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `UserButton` to `components/Navbar.tsx`**

Add the import at the top of `Navbar.tsx`:
```ts
import UserButton from '@/components/UserButton';
```

In the desktop nav controls `div` (the one with class `"hidden md:flex items-center gap-3"`), add `<UserButton />` before the closing `</div>`:

```tsx
<div className="hidden md:flex items-center gap-3">
  <div className="flex items-center gap-1 bg-bg-alt/80 rounded px-1 py-0.5">
    {langs.map(lng => ( /* existing lang buttons */ ))}
  </div>
  <button onClick={toggleTheme} /* existing theme button */ />
  <UserButton />
</div>
```

Also add `<UserButton />` to the mobile menu (inside the `menuOpen && (...)` block), after the language buttons div:

```tsx
<div className="flex items-center gap-3 mt-4">
  {/* existing lang buttons */}
</div>
<div className="mt-4">
  <UserButton />
</div>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/UserButton.tsx components/Navbar.tsx
git commit -m "feat: add UserButton with sign-in modal to Navbar"
```

---

### Task 9: Create authenticated order API route

**Files:**
- Create: `app/api/order/route.ts`

This route is used by signed-in users to place a takeaway order without OTP. It mirrors the order-creation logic from `/api/otp/verify` but requires a valid Supabase session instead of an OTP code.

- [ ] **Step 1: Create `app/api/order/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createUserServerClient } from '@/lib/supabase-ssr';
import { authenticatedOrderSchema } from '@/lib/validation';
import { escapeHtml } from '@/lib/utils';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createUserServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = authenticatedOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { customerName, customerPhone, items, total } = parsed.data;
    const email = user.email;

    const { data: order, error: orderError } = await supabase
      .from('imperial_orders')
      .insert({
        name: customerName,
        email,
        phone: customerPhone || null,
        items,
        total,
        user_id: user.id,
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Order insert error:', orderError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const restaurantEmail = process.env.RESTAURANT_EMAIL || 'imperial@restaurant.be';

    if (resendKey) {
      const resend = new Resend(resendKey);
      const firstName = escapeHtml(customerName?.split(' ')[0] || customerName || '');
      const safeEmail = escapeHtml(email);
      const safePhone = escapeHtml(customerPhone || '');

      const itemRows = items
        .map(i => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0">${i.quantity}×</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0">${escapeHtml(i.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0;text-align:right">${(i.price * i.quantity).toFixed(2)}€</td>
        </tr>`)
        .join('');

      const orderHtml = (forRestaurant: boolean) => `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1412">
          <div style="background:#c41e24;padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">
              ${forRestaurant ? 'Nouvelle commande traiteur' : 'Confirmation de commande'}
            </p>
          </div>
          <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
            ${forRestaurant
              ? `<p style="margin:0 0 16px"><strong>${escapeHtml(customerName)}</strong> — <a href="mailto:${safeEmail}" style="color:#c41e24">${safeEmail}</a>${safePhone ? ` — ${safePhone}` : ''}</p>`
              : `<p style="margin:0 0 16px">Bonjour ${firstName},<br>Merci pour votre commande !</p>`
            }
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">
              <thead>
                <tr style="background:#f0e8e0">
                  <th style="padding:8px 12px;text-align:left;font-weight:600">Qté</th>
                  <th style="padding:8px 12px;text-align:left;font-weight:600">Article</th>
                  <th style="padding:8px 12px;text-align:right;font-weight:600">Prix</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:12px;font-weight:700;font-size:15px">Total</td>
                  <td style="padding:12px;font-weight:700;font-size:15px;text-align:right;color:#c41e24">${Number(total).toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>
            ${!forRestaurant ? `
              <div style="border-left:3px solid #c41e24;padding:12px 16px;background:#fdf8f5;font-size:13px;color:#6b5b4f">
                <strong style="color:#1a1412">Restaurant Imperial</strong><br>
                Romeinsesteenweg 220, 1800 Vilvoorde<br>
                Tél : <a href="tel:+3222670270" style="color:#c41e24">02 267 02 70</a>
              </div>` : ''}
          </div>
          <div style="padding:16px 32px;background:#f0e8e0;font-size:12px;color:#9a8878;text-align:center">
            Restaurant Imperial — Vilvoorde, Belgique
          </div>
        </div>`;

      Promise.all([
        resend.emails.send({
          from: `Imperial Website <${fromEmail}>`,
          to: [restaurantEmail],
          subject: `Commande traiteur — ${customerName} (${Number(total).toFixed(2)}€)`,
          html: orderHtml(true),
          replyTo: email,
        }),
        resend.emails.send({
          from: `Restaurant Imperial <${fromEmail}>`,
          to: [email],
          subject: `Votre commande chez Imperial — confirmation`,
          html: orderHtml(false),
        }),
      ]).catch(err => console.error('Email send error:', err));
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (e) {
    console.error('Order route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/order/route.ts
git commit -m "feat: add authenticated order API route (no OTP required)"
```

---

### Task 10: Update `/api/reservation` to accept session as OTP alternative

**Files:**
- Modify: `app/api/reservation/route.ts`

- [ ] **Step 1: Replace `app/api/reservation/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';
import { createUserServerClient } from '@/lib/supabase-ssr';
import { consumeOtp } from '@/lib/otp';
import { reservationSchema, authenticatedReservationSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Try session-based auth first
    const ssrSupabase = await createUserServerClient();
    const { data: { user } } = await ssrSupabase.auth.getUser();

    if (user?.email) {
      // Signed-in path: no OTP required
      const parsed = authenticatedReservationSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      }
      const { guests, date, time, firstName, lastName, phone, specialRequests, locale } = parsed.data;

      const supabase = createPublicClient();
      const { data, error } = await supabase.from('imperial_reservations').insert({
        guests, date, time,
        first_name: firstName,
        last_name: lastName || '',
        email: user.email,
        phone: phone || null,
        special_requests: specialRequests || null,
        locale: locale || 'fr',
        user_id: user.id,
      }).select('id').single();

      if (error) {
        console.error('Reservation insert error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: data.id });
    }

    // Unauthenticated path: OTP required
    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { guests, date, time, firstName, lastName, email, phone, specialRequests, locale, code } = parsed.data;

    const otpResult = await consumeOtp(email, code);
    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.reason }, { status: 400 });
    }

    const supabase = createPublicClient();
    const { data, error } = await supabase.from('imperial_reservations').insert({
      guests, date, time,
      first_name: firstName,
      last_name: lastName || '',
      email, phone: phone || null,
      special_requests: specialRequests || null,
      locale: locale || 'fr',
    }).select('id').single();

    if (error) {
      console.error('Reservation insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    console.error('Reservation error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/reservation/route.ts
git commit -m "feat: accept Supabase session as OTP alternative in reservation route"
```

---

### Task 11: Update `TakeawayPanel` to skip OTP for signed-in users

**Files:**
- Modify: `components/TakeawayPanel.tsx`

The changes:
1. Import `useUser` from `UserProvider`
2. At the `details` step, pre-fill `name` and `email` from the user session (read-only)
3. Replace the "Proceed" button logic: if user is signed in, POST to `/api/order` instead of going to OTP step

- [ ] **Step 1: Add user import and state at top of `TakeawayPanel`**

Add to imports:
```ts
import { useUser } from '@/components/UserProvider';
```

Add inside the component, after the existing state declarations:
```ts
const { user } = useUser();
```

- [ ] **Step 2: Pre-fill name and email from user session**

Replace the existing `useEffect` that sets name/email (there is none — fields start empty). Add a new effect after the existing state declarations:

```ts
useEffect(() => {
  if (user) {
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
    setName(fullName || user.email?.split('@')[0] || '');
    setEmail(user.email ?? '');
  }
}, [user]);
```

- [ ] **Step 3: Replace `handleSendOtp` with a dual-path handler**

Find `async function handleSendOtp(e: React.FormEvent)`. Replace it with:

```ts
async function handleSendOtp(e: React.FormEvent) {
  e.preventDefault();
  setSending(true);
  setDetailsError('');

  // Signed-in users skip OTP and submit immediately
  if (user) {
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone || undefined,
          items,
          total,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDetailsError(data.error || 'Error');
        return;
      }
      clearOrder();
      setStep('success');
    } catch {
      setDetailsError('Network error');
    } finally {
      setSending(false);
    }
    return;
  }

  // Unauthenticated: send OTP
  try {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDetailsError(data.error || 'Error');
      return;
    }
    setStep('otp');
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  } catch {
    setDetailsError('Network error');
  } finally {
    setSending(false);
  }
}
```

- [ ] **Step 4: Make name/email fields read-only for signed-in users in the details step**

In the JSX details step, find the name and email inputs and update them:

```tsx
<input
  type="text"
  value={name}
  onChange={e => !user && setName(e.target.value)}
  readOnly={!!user}
  className={`w-full bg-bg border border-border rounded px-3 py-2 text-sm ... ${user ? 'opacity-60 cursor-not-allowed' : ''}`}
  required
/>
```

```tsx
<input
  type="email"
  value={email}
  onChange={e => !user && setEmail(e.target.value)}
  readOnly={!!user}
  className={`w-full bg-bg border border-border rounded px-3 py-2 text-sm ... ${user ? 'opacity-60 cursor-not-allowed' : ''}`}
  required
/>
```

- [ ] **Step 5: Update submit button label for signed-in users**

Find the submit button in the details form. Change its label so signed-in users see "Place order" instead of "Proceed to verification":

```tsx
<button type="submit" disabled={sending} className="...">
  {sending ? '…' : user ? (t.placeOrder || 'Place order') : (t.sendCode || 'Continue')}
</button>
```

- [ ] **Step 6: Add sign-in prompt above the OTP step for non-signed-in users**

In the `step === 'otp'` JSX section, add a sign-in nudge block at the very top (before the OTP digit inputs):

```tsx
{step === 'otp' && (
  <div className="...">
    {/* Sign-in nudge */}
    {!user && (
      <SignInNudge />
    )}
    {/* existing OTP inputs */}
  </div>
)}
```

Add the `SignInNudge` as a small inline client component at the top of the file (after imports):

```tsx
import SignInModal from '@/components/SignInModal';

function SignInNudge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 p-4 border border-border rounded-lg bg-surface text-center space-y-3">
      <p className="text-sm text-text-muted">Sign in to skip email verification</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-accent hover:underline"
      >
        Sign in with Google or Facebook
      </button>
      <SignInModal open={open} onClose={() => setOpen(false)} />
      <p className="text-xs text-text-muted">Or continue with email code below</p>
    </div>
  );
}
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/TakeawayPanel.tsx
git commit -m "feat: skip OTP in TakeawayPanel for signed-in users"
```

---

### Task 12: Update `Reservation` to skip OTP for signed-in users

**Files:**
- Modify: `components/Reservation.tsx`

The changes mirror Task 11 but for the reservation flow. Steps: import `useUser`, pre-fill name/email, skip step 3 (OTP) when user is signed in, submit without a code.

- [ ] **Step 1: Add user import**

Add to imports:
```ts
import { useUser } from '@/components/UserProvider';
```

Add inside the component body:
```ts
const { user } = useUser();
```

- [ ] **Step 2: Pre-fill name/email from session**

Add after the existing state declarations:
```ts
useEffect(() => {
  if (user) {
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
    const parts = fullName.split(' ');
    setFirstName(parts[0] || user.email?.split('@')[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
    setEmail(user.email ?? '');
  }
}, [user]);
```

- [ ] **Step 3: Update `handleConfirm` to skip OTP for signed-in users**

Find `async function handleConfirm()`. Replace it with:

```ts
async function handleConfirm() {
  if (!canConfirm() || submitting) return;
  setSubmitting(true);

  if (user) {
    // Signed-in: submit reservation directly without OTP
    try {
      const res = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests,
          date: selectedDate!.toISOString().split('T')[0],
          time: selectedTime,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          specialRequests: specialRequests.trim(),
          locale,
        }),
      });
      if (!res.ok) {
        setError(dict.otpError || 'Failed to submit. Please try again.');
        return;
      }
      setStep(4);
    } catch {
      setError(dict.otpError || 'Network error.');
    } finally {
      setSubmitting(false);
    }
    return;
  }

  // Unauthenticated: send OTP
  const ok = await sendOtp();
  setSubmitting(false);
  if (!ok) {
    setError(dict.otpError || 'Failed to send code. Please try again.');
    return;
  }
  setOtpDigits(['', '', '', '', '', '']);
  setOtpError('');
  setStep(3);
  setTimeout(() => otpRefs.current[0]?.focus(), 100);
}
```

- [ ] **Step 4: Make name/email fields read-only for signed-in users in step 2**

In the step 2 JSX, update the firstName, lastName, and email inputs to be `readOnly={!!user}` with `opacity-60 cursor-not-allowed` when user is present (same pattern as Task 11 Step 4).

- [ ] **Step 5: Update the confirm button label**

In step 2, change the confirm button to show "Reserve" instead of the OTP-send label when user is signed in:

```tsx
<button onClick={handleConfirm} disabled={!canConfirm() || submitting} className="...">
  {submitting ? '…' : user ? 'Reserve' : dict.confirm}
</button>
```

- [ ] **Step 6: Add sign-in prompt above the OTP step for non-signed-in users**

In the `step === 3` JSX block, add a sign-in nudge at the top (before the OTP digit inputs). Import `SignInModal` and add a local `SignInNudge` component at the top of the file (after imports):

```tsx
import SignInModal from '@/components/SignInModal';

function SignInNudge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 p-4 border border-border rounded-lg bg-surface/50 text-center space-y-3">
      <p className="text-sm text-text-muted">Sign in to skip email verification</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-accent hover:underline"
      >
        Sign in with Google or Facebook
      </button>
      <SignInModal open={open} onClose={() => setOpen(false)} />
      <p className="text-xs text-text-muted">Or continue with email code below</p>
    </div>
  );
}
```

In the step 3 JSX, add before the OTP digit inputs:

```tsx
{step === 3 && (
  <div className="space-y-6">
    {!user && <SignInNudge />}
    {/* existing OTP content */}
  </div>
)}
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/Reservation.tsx
git commit -m "feat: skip OTP in Reservation for signed-in users"
```

---

### Task 13: Handle `?signin=1` in `ClientHomePage`

**Files:**
- Modify: `components/ClientHomePage.tsx`

When the account page redirects unauthenticated users to `/?signin=1`, the `UserButton` in Navbar already handles opening the modal (Task 8). No changes needed to `ClientHomePage` — the `UserButton` reads `searchParams` on mount.

- [ ] **Step 1: Verify `UserButton` handles `?signin=1`**

The `useEffect` in `UserButton` already calls `setModalOpen(true)` when `searchParams.get('signin') === '1'`. Confirm `useSearchParams` is imported from `next/navigation` (done in Task 8).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. This task is a verification step — no code changes needed.

---

### Task 14: Create account page

**Files:**
- Create: `app/account/page.tsx`

This is a server component. It reads the session, redirects if unauthenticated, fetches order and reservation history, and renders two sections controlled by a `?tab=` search param.

- [ ] **Step 1: Create `app/account/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createUserServerClient } from '@/lib/supabase-ssr';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-300',
  confirmed: 'bg-blue-900/30 text-blue-300',
  preparing: 'bg-orange-900/30 text-orange-300',
  ready: 'bg-green-900/30 text-green-300',
  completed: 'bg-green-900/30 text-green-300',
  cancelled: 'bg-red-900/30 text-red-300',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createUserServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/?signin=1');
  }

  const { tab } = await searchParams;
  const activeTab = tab === 'reservations' ? 'reservations' : 'orders';

  const [{ data: orders }, { data: reservations }] = await Promise.all([
    supabase
      .from('imperial_orders')
      .select('id, created_at, total, status, items')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('imperial_reservations')
      .select('id, created_at, date, time, guests, status, first_name, last_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? '';

  return (
    <div className="min-h-screen bg-bg pt-[72px]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl italic">My account</h1>
            <p className="text-text-muted text-sm mt-1">{user.email}</p>
          </div>
          <span className="text-text-muted text-sm">{fullName}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-8">
          <Link
            href="/account?tab=orders"
            className={`px-4 py-2 text-sm transition-colors ${activeTab === 'orders' ? 'text-accent border-b-2 border-accent -mb-px' : 'text-text-muted hover:text-text'}`}
          >
            Orders {orders?.length ? `(${orders.length})` : ''}
          </Link>
          <Link
            href="/account?tab=reservations"
            className={`px-4 py-2 text-sm transition-colors ${activeTab === 'reservations' ? 'text-accent border-b-2 border-accent -mb-px' : 'text-text-muted hover:text-text'}`}
          >
            Reservations {reservations?.length ? `(${reservations.length})` : ''}
          </Link>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-4">
            {!orders?.length ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-text-muted">No orders yet.</p>
                <Link href="/takeaway" className="text-accent hover:underline text-sm">
                  Order takeaway →
                </Link>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-surface rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">
                      {new Date(order.created_at).toLocaleDateString('fr-BE', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[order.status] || 'bg-surface text-text-muted'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {(order.items as { name: string; quantity: number; price: number }[]).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.name}</span>
                        <span className="text-text-muted">{(item.price * item.quantity).toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end border-t border-border pt-2">
                    <span className="text-sm font-semibold text-accent">{Number(order.total).toFixed(2)}€</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="space-y-4">
            {!reservations?.length ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-text-muted">No reservations yet.</p>
                <Link href="/#contact" className="text-accent hover:underline text-sm">
                  Make a reservation →
                </Link>
              </div>
            ) : (
              reservations.map(res => (
                <div key={res.id} className="bg-surface rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(res.date).toLocaleDateString('fr-BE', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })} at {res.time}
                      </p>
                      <p className="text-text-muted text-sm mt-1">{res.guests} guests</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[res.status] || 'bg-surface text-text-muted'}`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/account/page.tsx
git commit -m "feat: add account page with order and reservation history"
```

---

### Task 15: Configure OAuth providers in Supabase + end-to-end smoke test

**Files:** None (configuration in Supabase dashboard)

- [ ] **Step 1: Enable Google OAuth in Supabase**

1. Open Supabase dashboard → Authentication → Providers → Google
2. Enable it and enter your Google OAuth Client ID and Secret (create at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials)
3. Add `https://<your-project>.supabase.co/auth/v1/callback` as an Authorized Redirect URI in Google Cloud Console
4. Save

- [ ] **Step 2: Enable Facebook OAuth in Supabase**

1. Supabase dashboard → Authentication → Providers → Facebook
2. Enable it and enter your Facebook App ID and Secret (create at [developers.facebook.com](https://developers.facebook.com))
3. Add `https://<your-project>.supabase.co/auth/v1/callback` as a Valid OAuth Redirect URI in Facebook App settings
4. Save

- [ ] **Step 3: Run the dev server and smoke test**

```bash
npm run dev
```

Smoke test checklist:
- [ ] Navbar shows "Sign in" button
- [ ] Clicking "Sign in" opens modal with Google and Facebook buttons
- [ ] Clicking Google redirects to Google OAuth → returns to site → navbar shows user avatar
- [ ] Clicking "My account" navigates to `/account` showing empty state
- [ ] Starting a takeaway order → cart panel → details step → name/email pre-filled and read-only
- [ ] Clicking "Place order" posts to `/api/order` and shows success step
- [ ] Order appears in `/account?tab=orders`
- [ ] Making a reservation while signed in → step 2 → clicking "Reserve" → skips OTP → shows step 4 confirmed
- [ ] Reservation appears in `/account?tab=reservations`
- [ ] Signing out → "Sign in" appears in navbar
- [ ] Unauthenticated reservation → OTP flow still works normally
- [ ] Visiting `/account` while signed out → redirects to `/?signin=1` → modal opens

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete user auth and order history (Google + Facebook OAuth)"
```
