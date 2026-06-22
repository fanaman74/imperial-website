# Stripe Payment Integration — Design Spec

**Date:** 2026-06-22
**Status:** Approved

## Summary

Add optional online card payment (via Stripe embedded Payment Element) to the takeaway ordering flow. Cash on pickup remains available. Payment method is chosen during the details step; card payers go through an embedded Stripe form before the order is saved.

## Flow

```
Cart
  → Details step (name/email/phone + payment method choice: Cash | Card)
      ↓ Cash                          ↓ Card
    OTP (guests only)               OTP (guests only)
      ↓                               ↓
    POST /api/order                 POST /api/stripe/payment-intent
      ↓                               ↓ returns clientSecret
    Success                         Payment step (embedded <PaymentElement>)
                                      ↓ stripe.confirmPayment() succeeds
                                    POST /api/order (with paymentIntentId)
                                      ↓
                                    Success
```

Signed-in users skip OTP in both paths (existing behaviour, unchanged).

## Components

### New: `POST /api/stripe/payment-intent`

- Requires an authenticated session (same auth guard as `/api/order`)
- Accepts `{ items: ClientCartItem[] }`
- Calls `recomputeOrder(items)` to get the server-authoritative total
- Creates a Stripe `PaymentIntent` in EUR: `amount` in cents, `currency: 'eur'`, `payment_method_types: ['card']`
- Returns `{ clientSecret: string }`
- Never trusts client-supplied totals — total always recomputed server-side

### Modified: `POST /api/order`

- Adds two optional fields to the request schema: `paymentMethod: 'cash' | 'card'` and `paymentIntentId?: string`
- If `paymentMethod === 'card'`: retrieves the PaymentIntent from Stripe and asserts `status === 'succeeded'` before inserting the order. Returns 400 if not succeeded.
- Stores `payment_method` and `stripe_payment_intent_id` on the `imperial_orders` row (new nullable columns, added via Supabase migration)
- Defaults to `'cash'` if `paymentMethod` is absent (backwards compatible with OTP guest path)

### Modified: `TakeawayPanel.tsx`

- New step type: `'payment'`
- Details step: adds a payment method toggle (Cash on pickup / Pay by card) stored in local state `paymentMethod: 'cash' | 'card'`
- On details submit with `paymentMethod === 'card'`: after OTP (or immediately for signed-in users), calls `POST /api/stripe/payment-intent` then transitions to `'payment'` step with the returned `clientSecret`
- Payment step: renders `<Elements stripe={stripePromise} options={{ clientSecret }}>` wrapping a `<PaymentElement />` and a "Pay €X.XX" confirm button
- On `stripe.confirmPayment` returning no error: calls `POST /api/order` with `paymentMethod: 'card'` and `paymentIntentId`, then transitions to `'success'`
- On Stripe error: shows error message inline, stays on payment step

### New: `lib/stripe.ts`

- Exports `getStripe()` — lazily loads `@stripe/stripe-js` with the publishable key
- Used by the frontend only; secret key never imported here

## Database

Migration adds two nullable columns to `imperial_orders`:

```sql
alter table imperial_orders
  add column if not exists payment_method text default 'cash',
  add column if not exists stripe_payment_intent_id text;
```

## Environment Variables

| Variable | Where | Value |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `.env.local` + Vercel | `pk_test_51TJJ…` (provided) |
| `STRIPE_SECRET_KEY` | `.env.local` + Vercel | `sk_test_…` (user must add) |

The secret key is never committed to git.

## Dependencies

- `stripe` (server-side Node SDK)
- `@stripe/stripe-js` (browser loader)
- `@stripe/react-stripe-js` (React components: `Elements`, `PaymentElement`, `useStripe`, `useElements`)

## Error Handling

- PaymentIntent creation fails → show error on details step, don't advance
- `stripe.confirmPayment` returns an error → show Stripe's `error.message` inline on payment step
- `/api/order` receives a PaymentIntent that is not `succeeded` → 400, show generic error on payment step
- Network errors → same pattern as existing flow (show inline error string)

## Out of Scope

- Stripe webhooks (can be added later for production hardening)
- Refunds
- Saving cards / recurring payments
- Apple Pay / Google Pay (Payment Element supports these automatically in production; no extra work needed)
