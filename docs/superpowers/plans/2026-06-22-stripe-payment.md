# Stripe Payment Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional online card payment via Stripe embedded Payment Element to the takeaway drawer, alongside the existing cash-on-pickup option.

**Architecture:** A payment method toggle (Cash / Card) is added to the details step. Card payers go through an embedded Stripe Payment Element before the order is saved. Signed-in users hit a new `/api/stripe/payment-intent` route; guests get a `clientSecret` back from the modified `/api/otp/verify` route (which creates the PaymentIntent at OTP-verification time). After Stripe confirms payment, the order is saved (signed-in → `/api/order`, guest → `/api/order/guest-card`) and emails are sent.

**Tech Stack:** `stripe` (Node SDK, server), `@stripe/stripe-js` + `@stripe/react-stripe-js` (browser), Next.js App Router API routes, Supabase (service role for INSERT), Zod validation, Resend emails.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/stripe.ts` | Lazy-load Stripe.js with publishable key (frontend only) |
| Create | `app/api/stripe/payment-intent/route.ts` | Create PaymentIntent for signed-in users |
| Create | `app/api/order/guest-card/route.ts` | Save order after Stripe payment for guests |
| Create | `supabase/migrations/20260622000000_stripe_payment_columns.sql` | Add `payment_method` + `stripe_payment_intent_id` to `imperial_orders` |
| Modify | `lib/validation.ts` | Add schemas for new routes + extend existing schemas |
| Modify | `app/api/otp/verify/route.ts` | Add card path: verify OTP then return `clientSecret` instead of saving order |
| Modify | `app/api/order/route.ts` | Accept `paymentMethod`/`paymentIntentId`, verify PI for card orders |
| Modify | `lib/i18n/dictionaries/fr.json` | Add payment method strings |
| Modify | `lib/i18n/dictionaries/nl.json` | Add payment method strings |
| Modify | `lib/i18n/dictionaries/en.json` | Add payment method strings |
| Modify | `components/TakeawayPanel.tsx` | Payment method toggle + new `payment` step with Stripe Elements |

---

## Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install Stripe packages**

```bash
cd /Users/fred/Documents/VibeCoding/hermes/imperial-website
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

Expected output ends with: `added N packages`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install stripe dependencies"
```

---

## Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20260622000000_stripe_payment_columns.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260622000000_stripe_payment_columns.sql
alter table imperial_orders
  add column if not exists payment_method text not null default 'cash',
  add column if not exists stripe_payment_intent_id text;
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db push
```

Expected: migration applied with no errors. If supabase CLI is not linked, run `npx supabase link` first.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260622000000_stripe_payment_columns.sql
git commit -m "feat: add payment_method and stripe_payment_intent_id columns to imperial_orders"
```

---

## Task 3: Create `lib/stripe.ts`

**Files:**
- Create: `lib/stripe.ts`

- [ ] **Step 1: Write the file**

```typescript
// lib/stripe.ts
import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts
git commit -m "feat: add Stripe.js lazy loader"
```

---

## Task 4: Update validation schemas

**Files:**
- Modify: `lib/validation.ts`
- Test: `lib/validation.test.ts`

- [ ] **Step 1: Write failing tests first**

Add these tests to `lib/validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  authenticatedOrderSchema,
  otpVerifySchema,
  guestCardOrderSchema,
  paymentIntentRequestSchema,
} from './validation';

describe('authenticatedOrderSchema with payment fields', () => {
  const base = {
    customerName: 'Alice',
    items: [{ id: '1', name: 'Spring roll', quantity: 2, price: 5 }],
    total: 10,
  };

  it('defaults paymentMethod to cash', () => {
    const result = authenticatedOrderSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.paymentMethod).toBe('cash');
  });

  it('accepts card with paymentIntentId', () => {
    const result = authenticatedOrderSchema.safeParse({
      ...base,
      paymentMethod: 'card',
      paymentIntentId: 'pi_test_abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown paymentMethod', () => {
    const result = authenticatedOrderSchema.safeParse({ ...base, paymentMethod: 'bitcoin' });
    expect(result.success).toBe(false);
  });
});

describe('otpVerifySchema with paymentMethod', () => {
  const base = {
    email: 'test@example.com',
    code: '123456',
    items: [{ id: '1', name: 'Spring roll', quantity: 1, price: 5 }],
    total: 5,
  };

  it('defaults paymentMethod to cash', () => {
    const result = otpVerifySchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.paymentMethod).toBe('cash');
  });

  it('accepts card paymentMethod', () => {
    const result = otpVerifySchema.safeParse({ ...base, paymentMethod: 'card' });
    expect(result.success).toBe(true);
  });
});

describe('guestCardOrderSchema', () => {
  it('validates required fields', () => {
    const result = guestCardOrderSchema.safeParse({
      email: 'guest@example.com',
      customerName: 'Bob',
      items: [{ id: '2', name: 'Fried rice', quantity: 1, price: 8 }],
      total: 8,
      paymentIntentId: 'pi_test_xyz',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing paymentIntentId', () => {
    const result = guestCardOrderSchema.safeParse({
      email: 'guest@example.com',
      customerName: 'Bob',
      items: [{ id: '2', name: 'Fried rice', quantity: 1, price: 8 }],
      total: 8,
    });
    expect(result.success).toBe(false);
  });
});

describe('paymentIntentRequestSchema', () => {
  it('validates items array', () => {
    const result = paymentIntentRequestSchema.safeParse({
      items: [{ id: '1', name: 'Spring roll', quantity: 2, price: 5 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items', () => {
    const result = paymentIntentRequestSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run lib/validation.test.ts
```

Expected: multiple FAIL — schemas not yet extended.

- [ ] **Step 3: Update `lib/validation.ts`**

Replace the file content with:

```typescript
import { z } from 'zod';

export const LOCALES = ['fr', 'nl', 'en'] as const;
export const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'] as const;
export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'] as const;
export const EVENT_REQUEST_STATUSES = ['pending', 'contacted', 'confirmed', 'declined'] as const;
export const EVENT_TYPES = ['birthday', 'corporate', 'wedding', 'family', 'catering', 'other'] as const;
export const PAYMENT_METHODS = ['cash', 'card'] as const;

export const emailSchema = z.string()
  .transform(s => s.trim().toLowerCase())
  .pipe(z.string().email().max(254));

export const otpSendSchema = z.object({
  email: emailSchema,
  name: z.string().max(100).optional(),
  locale: z.enum(LOCALES).optional().default('fr'),
});

export const cartItemSchema = z.object({
  id: z.coerce.string().max(100),
  name: z.string().max(200),
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0).max(9999),
});

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(30).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
  total: z.number().min(0).max(99999),
  locale: z.enum(LOCALES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default('cash'),
});

export const authenticatedOrderSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(30).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
  total: z.number().min(0).max(99999),
  locale: z.enum(LOCALES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default('cash'),
  paymentIntentId: z.string().max(100).optional(),
});

export const guestCardOrderSchema = z.object({
  email: emailSchema,
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(30).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
  total: z.number().min(0).max(99999),
  locale: z.enum(LOCALES).optional(),
  paymentIntentId: z.string().min(1).max(100),
});

export const paymentIntentRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
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

export const reservationSchema = z.object({
  guests: z.number().int().min(1).max(50),
  date: z.string().max(20),
  time: z.string().max(10),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(''),
  email: emailSchema,
  phone: z.string().max(30).optional(),
  specialRequests: z.string().max(2000).optional(),
  locale: z.enum(LOCALES).optional(),
  code: z.string().length(6),
});

export const eventContactSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: emailSchema,
  phone: z.string().max(30).optional(),
  event_type: z.enum(EVENT_TYPES),
  event_date: z.string().max(20).optional(),
  guests: z.union([z.number().int().min(1).max(500), z.string()]).optional(),
  message: z.string().max(5000).optional(),
  code: z.string().length(6),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const statusUpdateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string().min(1).max(50),
});

export const menuItemTranslationSchema = z.object({
  name: z.string().max(200).optional().default(''),
  description: z.string().max(2000).optional().default(''),
});

export const menuItemSchema = z.object({
  category_id: z.union([z.string(), z.number()]),
  num: z.union([z.string(), z.number()]).nullable().optional(),
  price_restaurant: z.union([z.number(), z.string()]).optional(),
  price_takeaway: z.union([z.number(), z.string()]).nullable().optional(),
  active: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  featured_image: z.string().url().max(1000).nullable().optional(),
  sort_order: z.union([z.number(), z.string()]).optional().default(0),
  translations: z.record(z.enum(LOCALES), menuItemTranslationSchema).optional(),
});
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run lib/validation.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts lib/validation.test.ts
git commit -m "feat: extend validation schemas for Stripe payment fields"
```

---

## Task 5: Create `app/api/stripe/payment-intent/route.ts`

**Files:**
- Create: `app/api/stripe/payment-intent/route.ts`

This route is used by **signed-in users only** to create a PaymentIntent before showing the Stripe form.

- [ ] **Step 1: Write the route**

```typescript
// app/api/stripe/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createUserServerClient } from '@/lib/supabase-ssr';
import { recomputeOrder, OrderPricingError } from '@/lib/orders';
import { paymentIntentRequestSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createUserServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = paymentIntentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    let total: number;
    try {
      ({ total } = await recomputeOrder(parsed.data.items));
    } catch (e) {
      if (e instanceof OrderPricingError) {
        return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
      }
      throw e;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'eur',
      payment_method_types: ['card'],
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    console.error('payment-intent route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/payment-intent/route.ts
git commit -m "feat: add /api/stripe/payment-intent route for authenticated users"
```

---

## Task 6: Modify `app/api/otp/verify/route.ts` — add card path

**Files:**
- Modify: `app/api/otp/verify/route.ts`

When `paymentMethod === 'card'`: verify & consume OTP, create PaymentIntent with `metadata.guestOrder` + `metadata.email`, return `{ clientSecret, paymentIntentId }`. Do NOT save the order. The existing cash path is unchanged.

- [ ] **Step 1: Replace the route**

```typescript
// app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase-server';
import { consumeOtp } from '@/lib/otp';
import { recomputeOrder, OrderPricingError } from '@/lib/orders';
import { buildOrderEmails } from '@/lib/order-email';
import { otpVerifySchema } from '@/lib/validation';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = otpVerifySchema.safeParse(body);
    if (!parsed.success) {
      console.error('[otp/verify] schema error:', JSON.stringify(parsed.error.issues));
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { email, code, customerName, customerPhone, locale, paymentMethod } = parsed.data;

    // Never trust client prices/total — recompute before consuming the OTP.
    let items, total;
    try {
      ({ items, total } = await recomputeOrder(parsed.data.items));
    } catch (e) {
      if (e instanceof OrderPricingError) {
        return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
      }
      throw e;
    }

    // Verify and consume OTP (handles brute-force lockout)
    const otpResult = await consumeOtp(email, code);
    console.log('[otp/verify]', { email, codeLen: code.length, result: otpResult });
    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.reason }, { status: 400 });
    }

    // Card path: create PaymentIntent and return clientSecret — order saved after payment
    if (paymentMethod === 'card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'eur',
        payment_method_types: ['card'],
        metadata: { guestOrder: 'true', email },
      });
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

    // Cash path (default): insert order immediately and send emails
    const supabase = createServerClient();
    const { data: order, error: orderError } = await supabase
      .from('imperial_orders')
      .insert({
        name: customerName,
        email,
        phone: customerPhone || null,
        items,
        total,
        payment_method: 'cash',
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
      const { customer, restaurant } = buildOrderEmails({
        locale,
        customerName: customerName || '',
        email,
        phone: customerPhone,
        items,
        total,
      });

      Promise.all([
        resend.emails.send({
          from: `Imperial Website <${fromEmail}>`,
          to: [restaurantEmail],
          subject: restaurant.subject,
          html: restaurant.html,
          replyTo: email,
        }),
        resend.emails.send({
          from: `Restaurant Imperial <${fromEmail}>`,
          to: [email],
          subject: customer.subject,
          html: customer.html,
        }),
      ]).catch(err => console.error('Email send error:', err));
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (e) {
    console.error('OTP verify error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/otp/verify/route.ts
git commit -m "feat: add card payment path to otp/verify — returns clientSecret instead of saving order"
```

---

## Task 7: Create `app/api/order/guest-card/route.ts`

**Files:**
- Create: `app/api/order/guest-card/route.ts`

Called by guests after Stripe payment succeeds. Verifies the PaymentIntent is `succeeded` and that its `metadata.email` matches the submitted email (proving OTP was done for this email), then saves the order and sends emails.

- [ ] **Step 1: Write the route**

```typescript
// app/api/order/guest-card/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase-server';
import { recomputeOrder, OrderPricingError } from '@/lib/orders';
import { buildOrderEmails } from '@/lib/order-email';
import { guestCardOrderSchema } from '@/lib/validation';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = guestCardOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { email, customerName, customerPhone, locale, paymentIntentId } = parsed.data;

    // Verify PaymentIntent status and that it was created for this email
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return NextResponse.json({ error: 'Payment not found' }, { status: 400 });
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }
    if (paymentIntent.metadata?.guestOrder !== 'true' || paymentIntent.metadata?.email !== email) {
      return NextResponse.json({ error: 'Payment mismatch' }, { status: 400 });
    }

    // Recompute prices server-side (never trust client total)
    let items, total;
    try {
      ({ items, total } = await recomputeOrder(parsed.data.items));
    } catch (e) {
      if (e instanceof OrderPricingError) {
        return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
      }
      throw e;
    }

    const supabase = createServerClient();
    const { data: order, error: orderError } = await supabase
      .from('imperial_orders')
      .insert({
        name: customerName,
        email,
        phone: customerPhone || null,
        items,
        total,
        payment_method: 'card',
        stripe_payment_intent_id: paymentIntentId,
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Guest card order insert error:', orderError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const restaurantEmail = process.env.RESTAURANT_EMAIL || 'imperial@restaurant.be';

    if (resendKey) {
      const resend = new Resend(resendKey);
      const { customer, restaurant } = buildOrderEmails({
        locale,
        customerName,
        email,
        phone: customerPhone,
        items,
        total,
      });

      Promise.all([
        resend.emails.send({
          from: `Imperial Website <${fromEmail}>`,
          to: [restaurantEmail],
          subject: restaurant.subject,
          html: restaurant.html,
          replyTo: email,
        }),
        resend.emails.send({
          from: `Restaurant Imperial <${fromEmail}>`,
          to: [email],
          subject: customer.subject,
          html: customer.html,
        }),
      ]).catch(err => console.error('Email send error:', err));
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (e) {
    console.error('guest-card order error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/order/guest-card/route.ts
git commit -m "feat: add /api/order/guest-card route for guest card payments"
```

---

## Task 8: Modify `app/api/order/route.ts` — add card payment verification

**Files:**
- Modify: `app/api/order/route.ts`

Signed-in users paying by card send `paymentMethod: 'card'` and `paymentIntentId`. The route verifies the PaymentIntent is `succeeded` before saving the order.

- [ ] **Step 1: Replace the route**

```typescript
// app/api/order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createUserServerClient } from '@/lib/supabase-ssr';
import { createServerClient } from '@/lib/supabase-server';
import { authenticatedOrderSchema } from '@/lib/validation';
import { recomputeOrder, OrderPricingError } from '@/lib/orders';
import { buildOrderEmails } from '@/lib/order-email';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
    const { customerName, customerPhone, locale, paymentMethod, paymentIntentId } = parsed.data;
    const email = user.email;

    // Verify PaymentIntent for card orders
    if (paymentMethod === 'card') {
      if (!paymentIntentId) {
        return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
      }
      let pi;
      try {
        pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      } catch {
        return NextResponse.json({ error: 'Payment not found' }, { status: 400 });
      }
      if (pi.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
      }
    }

    // Never trust client prices/total — recompute from authoritative DB prices.
    let items, total;
    try {
      ({ items, total } = await recomputeOrder(parsed.data.items));
    } catch (e) {
      if (e instanceof OrderPricingError) {
        return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
      }
      throw e;
    }

    const { data: order, error: orderError } = await createServerClient()
      .from('imperial_orders')
      .insert({
        name: customerName,
        email,
        phone: customerPhone || null,
        items,
        total,
        user_id: user.id,
        payment_method: paymentMethod ?? 'cash',
        stripe_payment_intent_id: paymentIntentId ?? null,
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
      const { customer, restaurant } = buildOrderEmails({
        locale,
        customerName,
        email,
        phone: customerPhone,
        items,
        total,
      });

      Promise.all([
        resend.emails.send({
          from: `Imperial Website <${fromEmail}>`,
          to: [restaurantEmail],
          subject: restaurant.subject,
          html: restaurant.html,
          replyTo: email,
        }),
        resend.emails.send({
          from: `Restaurant Imperial <${fromEmail}>`,
          to: [email],
          subject: customer.subject,
          html: customer.html,
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/order/route.ts
git commit -m "feat: verify Stripe PaymentIntent in /api/order for card payments"
```

---

## Task 9: Add i18n strings for payment method

**Files:**
- Modify: `lib/i18n/dictionaries/fr.json`
- Modify: `lib/i18n/dictionaries/nl.json`
- Modify: `lib/i18n/dictionaries/en.json`

Add the following keys to the `"order"` object in each file.

- [ ] **Step 1: Update `fr.json`**

In `lib/i18n/dictionaries/fr.json`, inside the `"order": { ... }` object, add before the closing `}`:

```json
    "paymentMethodLabel": "Paiement",
    "paymentCash": "Espèces à la collecte",
    "paymentCard": "Carte bancaire",
    "payNow": "Payer",
    "processing": "Traitement…",
    "placeOrder": "Confirmer la commande"
```

- [ ] **Step 2: Update `nl.json`**

In `lib/i18n/dictionaries/nl.json`, inside the `"order": { ... }` object, add before the closing `}`:

```json
    "paymentMethodLabel": "Betaalmethode",
    "paymentCash": "Contant bij afhaling",
    "paymentCard": "Bankkaart",
    "payNow": "Betalen",
    "processing": "Verwerken…",
    "placeOrder": "Bestelling bevestigen"
```

- [ ] **Step 3: Update `en.json`**

In `lib/i18n/dictionaries/en.json`, inside the `"order": { ... }` object, add before the closing `}`:

```json
    "paymentMethodLabel": "Payment",
    "paymentCash": "Cash on pickup",
    "paymentCard": "Credit / debit card",
    "payNow": "Pay",
    "processing": "Processing…",
    "placeOrder": "Place order"
```

- [ ] **Step 4: Verify JSON is valid**

```bash
node -e "require('./lib/i18n/dictionaries/fr.json'); require('./lib/i18n/dictionaries/nl.json'); require('./lib/i18n/dictionaries/en.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/dictionaries/fr.json lib/i18n/dictionaries/nl.json lib/i18n/dictionaries/en.json
git commit -m "feat: add payment method i18n strings (FR/NL/EN)"
```

---

## Task 10: Modify `components/TakeawayPanel.tsx` — add payment step

**Files:**
- Modify: `components/TakeawayPanel.tsx`

This is the largest change. The panel gets a `paymentMethod` toggle in the details step and a new `payment` step with `<Elements>` + `<PaymentElement>`.

Key decisions:
- `PaymentForm` is a separate inner component (needs `useStripe`/`useElements` which require being inside `<Elements>`)
- `<Elements>` is only rendered on the `payment` step, conditionally with the `clientSecret`
- `getStripe()` is called once at module level so the Stripe.js script is not re-fetched

- [ ] **Step 1: Replace `components/TakeawayPanel.tsx` in full**

```typescript
'use client';
import { useState, useRef, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useOrder } from './OrderProvider';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/components/UserProvider';
import SignInModal from '@/components/SignInModal';
import { getStripe } from '@/lib/stripe';

type Step = 'cart' | 'details' | 'otp' | 'payment' | 'success';
type PaymentMethod = 'cash' | 'card';

const stripePromise = getStripe();

function SignInNudge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 p-4 border border-border rounded-lg bg-surface text-center space-y-3">
      <p className="text-sm text-text-muted">Connectez-vous pour éviter la vérification par email</p>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-accent hover:underline">
        Se connecter / Créer un compte
      </button>
      <SignInModal open={open} onClose={() => setOpen(false)} />
      <p className="text-xs text-text-muted">Ou continuez avec le code ci-dessous</p>
    </div>
  );
}

interface PaymentFormProps {
  total: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
  t: Record<string, string>;
}

function PaymentForm({ total, onSuccess, onError, t }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message ?? 'Payment failed');
      setProcessing(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      onError('Payment not completed');
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col flex-1 px-6 py-6">
      <PaymentElement className="mb-6" />
      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full py-3 text-sm uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors disabled:opacity-50 mt-auto"
      >
        {processing ? (t.processing || 'Processing…') : `${t.payNow || 'Pay'} ${total.toFixed(2)} €`}
      </button>
    </form>
  );
}

export default function TakeawayPanel() {
  const { items, updateQuantity, removeItem, clearOrder, total } = useOrder();
  const { locale, dict } = useLanguage();
  const { user } = useUser();
  const t = (dict as any).order as Record<string, string>;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('cart');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (user) {
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
      setName(fullName || user.email?.split('@')[0] || '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>('button, input, a, select');
    focusable[0]?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab' && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function close() { setOpen(false); }

  function reset() {
    setStep('cart');
    setName(''); setEmail(''); setPhone('');
    setPaymentMethod('cash');
    setClientSecret(null); setPaymentIntentId(null);
    setOtp(['', '', '', '', '', '']);
    setSending(false); setVerifying(false);
    setDetailsError(''); setOtpError(''); setPaymentError('');
  }

  async function handleDetails(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setDetailsError('');

    if (user) {
      if (paymentMethod === 'card') {
        // Signed-in + card: create PaymentIntent, then show payment step
        try {
          const res = await fetch('/api/stripe/payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          });
          const data = await res.json();
          if (!res.ok) { setDetailsError(data.error || 'Error'); setSending(false); return; }
          setClientSecret(data.clientSecret);
          setStep('payment');
        } catch {
          setDetailsError('Network error');
        } finally {
          setSending(false);
        }
        return;
      }

      // Signed-in + cash: place order immediately
      try {
        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerName: name, customerPhone: phone || undefined, items, total, locale, paymentMethod: 'cash' }),
        });
        const data = await res.json();
        if (!res.ok) { setDetailsError(data.error || 'Error'); return; }
        clearOrder();
        setStep('success');
      } catch {
        setDetailsError('Network error');
      } finally {
        setSending(false);
      }
      return;
    }

    // Guest: send OTP regardless of payment method (OTP verify handles the branching)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, locale }),
      });
      const data = await res.json();
      if (!res.ok) { setDetailsError(data.error || 'Error'); return; }
      setStep('otp');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setDetailsError('Network error');
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    setSending(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, locale }),
      });
      if (!res.ok) { setOtpError(t.otpError || 'Error'); return; }
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setOtpError('Network error');
    } finally {
      setSending(false);
    }
  }

  function handleOtpInput(i: number, val: string) {
    const digit = val.replace(/\D/, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (digit && i === 5 && next.every(d => d)) verifyOtp(next.join(''));
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
      verifyOtp(pasted);
    }
    e.preventDefault();
  }

  async function verifyOtp(code: string) {
    setVerifying(true);
    setOtpError('');
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, customerName: name, customerPhone: phone || undefined, items, total, locale, paymentMethod }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || t.otpError || 'Code incorrect ou expiré');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        return;
      }

      if (paymentMethod === 'card' && data.clientSecret) {
        // Card path: server returns clientSecret — show payment step
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setStep('payment');
        return;
      }

      // Cash path: order already saved by the server
      clearOrder();
      setStep('success');
    } catch {
      setOtpError('Network error');
    } finally {
      setVerifying(false);
    }
  }

  async function handlePaymentSuccess(confirmedPaymentIntentId: string) {
    setPaymentError('');
    try {
      // Signed-in users go to /api/order; guests go to /api/order/guest-card
      if (user) {
        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: name,
            customerPhone: phone || undefined,
            items,
            total,
            locale,
            paymentMethod: 'card',
            paymentIntentId: confirmedPaymentIntentId,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setPaymentError(data.error || 'Error saving order'); return; }
      } else {
        const res = await fetch('/api/order/guest-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            customerName: name,
            customerPhone: phone || undefined,
            items,
            total,
            locale,
            paymentIntentId: confirmedPaymentIntentId,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setPaymentError(data.error || 'Error saving order'); return; }
      }
      clearOrder();
      setStep('success');
    } catch {
      setPaymentError('Network error');
    }
  }

  if (count === 0 && !open && step !== 'success') return null;

  return (
    <>
      {!open && count > 0 && (
        <button
          onClick={() => { setOpen(true); setStep('cart'); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-bg flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          aria-label="Open cart"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-bg text-accent text-xs font-medium flex items-center justify-center">
            {count}
          </span>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={close} aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.title || 'Cart'}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] bg-bg border-l border-border flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                {(step === 'details' || step === 'otp' || step === 'payment') && (
                  <button
                    onClick={() => setStep(step === 'otp' ? 'details' : step === 'payment' ? (user ? 'details' : 'otp') : 'cart')}
                    className="text-text-muted hover:text-text transition-colors"
                    aria-label="Back"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h3 className="font-display text-xl italic">
                  {step === 'cart' && t.title}
                  {step === 'details' && (t.customerName?.replace('Votre ', '').replace('Uw ', '') || 'Commande')}
                  {step === 'otp' && t.otpLabel}
                  {step === 'payment' && (t.paymentMethodLabel || 'Paiement')}
                  {step === 'success' && t.successTitle}
                </h3>
              </div>
              <button onClick={close} className="text-text-muted hover:text-text transition-colors text-sm">{t.close}</button>
            </div>

            {step === 'cart' && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {items.length === 0 ? (
                    <p className="text-text-muted text-center py-12">{t.empty}</p>
                  ) : (
                    <div className="space-y-4">
                      {items.map(item => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {item.desc && <p className="text-xs text-text-muted truncate">{item.desc}</p>}
                            <p className="text-sm text-accent mt-1">{(item.price * item.quantity).toFixed(2)}&euro;</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border border-border text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center text-xs">&minus;</button>
                            <span className="text-sm w-5 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full border border-border text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center text-xs">+</button>
                            <button onClick={() => removeItem(item.id)} className="ml-1 text-text-muted hover:text-red-400 transition-colors" aria-label={`Remove ${item.name}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="border-t border-border px-6 py-4 space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm uppercase tracking-wider text-text-muted">{t.total}</span>
                      <span className="font-display text-xl text-accent">{total.toFixed(2)}&euro;</span>
                    </div>
                    <p className="text-xs text-accent/70 text-right">–10% tarif emporter inclus</p>
                    <button
                      onClick={() => setStep('details')}
                      className="w-full py-3 text-sm uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors"
                    >
                      {t.emailOrder}
                    </button>
                  </div>
                )}
              </>
            )}

            {step === 'details' && (
              <form onSubmit={handleDetails} className="flex flex-col flex-1 overflow-y-auto">
                <div className="flex-1 px-6 py-6 space-y-4">
                  <p className="text-xs text-text-muted leading-relaxed">{t.otpNote}</p>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted mb-1.5">{t.customerName} *</label>
                    <input type="text" required value={name} onChange={e => !user && setName(e.target.value)} readOnly={!!user} className={`w-full bg-transparent border border-border rounded-sm px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors${user ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted mb-1.5">{t.customerEmail} *</label>
                    <input type="email" required value={email} onChange={e => !user && setEmail(e.target.value)} readOnly={!!user} className={`w-full bg-transparent border border-border rounded-sm px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors${user ? ' opacity-60 cursor-not-allowed' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-text-muted mb-1.5">{t.customerPhone}</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+32 …" className="w-full bg-transparent border border-border rounded-sm px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-text-muted mb-2">{t.paymentMethodLabel || 'Paiement'}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex-1 py-2 text-xs uppercase tracking-wider border transition-colors ${paymentMethod === 'cash' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-accent/50'}`}
                      >
                        {t.paymentCash || 'Cash'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 py-2 text-xs uppercase tracking-wider border transition-colors ${paymentMethod === 'card' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:border-accent/50'}`}
                      >
                        {t.paymentCard || 'Card'}
                      </button>
                    </div>
                  </div>
                  {detailsError && <p className="text-red-400 text-xs">{detailsError}</p>}
                </div>
                <div className="px-6 py-3 border-t border-border/50 bg-bg-alt/40 shrink-0">
                  <div className="flex justify-between text-xs text-text-muted mb-0.5">
                    <span>{count} article{count > 1 ? 's' : ''}</span>
                    <span className="text-accent font-semibold">{total.toFixed(2)}&euro;</span>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border shrink-0">
                  <button type="submit" disabled={sending} className="w-full py-3 text-sm uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors disabled:opacity-50">
                    {sending ? t.sending : user ? (t.placeOrder || 'Confirmer') : t.sendOtp}
                  </button>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <div className="flex flex-col flex-1 px-6 py-6">
                {!user && <SignInNudge />}
                <p className="text-sm text-text-muted mb-1">{t.otpSentTo}</p>
                <p className="text-sm font-medium text-accent mb-8 truncate">{email}</p>
                <p className="text-xs uppercase tracking-widest text-text-muted mb-4">{t.otpLabel}</p>
                <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      disabled={verifying}
                      aria-label={`OTP digit ${i + 1} of 6`}
                      className="w-11 h-14 text-center text-xl font-mono font-bold border border-border rounded-sm bg-transparent text-text focus:outline-none focus:border-accent transition-colors disabled:opacity-40"
                    />
                  ))}
                </div>
                {otpError && <p className="text-red-400 text-xs text-center mb-4">{otpError}</p>}
                {verifying && <p className="text-text-muted text-xs text-center">{t.verifying}</p>}
                {!verifying && (
                  <button onClick={() => verifyOtp(otp.join(''))} disabled={otp.some(d => !d)} className="w-full py-3 text-sm uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors disabled:opacity-40 mt-auto">
                    {t.verify}
                  </button>
                )}
                <button
                  onClick={() => { setOtp(['', '', '', '', '', '']); handleResend(); }}
                  className="mt-3 text-xs text-text-muted hover:text-text underline text-center"
                >
                  {t.resendCode || 'Renvoyer le code'}
                </button>
              </div>
            )}

            {step === 'payment' && clientSecret && (
              <div className="flex flex-col flex-1 overflow-y-auto">
                {paymentError && (
                  <p className="text-red-400 text-xs px-6 pt-4">{paymentError}</p>
                )}
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#c41e24' } } }}>
                  <PaymentForm
                    total={total}
                    onSuccess={handlePaymentSuccess}
                    onError={msg => setPaymentError(msg)}
                    t={t}
                  />
                </Elements>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col flex-1 items-center justify-center px-6 text-center gap-5">
                <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display italic text-2xl mb-2">{t.successTitle}</h4>
                  <p className="text-text-muted text-sm leading-relaxed">{t.successBody}</p>
                </div>
                <button onClick={() => { reset(); close(); }} className="border border-accent text-accent px-8 py-2.5 text-xs uppercase tracking-widest hover:bg-accent hover:text-bg transition-colors">
                  {t.newOrder}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and manually test**

```bash
npm run dev
```

Open `http://localhost:3000/takeaway`. Test both paths:

**Cash path:**
1. Add items to cart → open panel → fill details → select "Cash" → submit
2. Signed-in: should go directly to success. Guest: should show OTP step → enter code → success.

**Card path:**
1. Add items to cart → open panel → fill details → select "Card" → submit
2. Signed-in: should show Stripe Payment Element. Use test card `4242 4242 4242 4242`, any future expiry, any CVC → Pay → success.
3. Guest: show OTP → enter code → show Stripe Payment Element → Pay → success.

- [ ] **Step 4: Commit**

```bash
git add components/TakeawayPanel.tsx
git commit -m "feat: add Stripe Payment Element to takeaway panel with cash/card toggle"
```

---

## Task 11: Final smoke test and push

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: TypeScript clean build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Push**

```bash
git push
```
