# Restaurant Imperial — Website

Trilingual (FR/NL/EN) website for Restaurant Imperial, a Chinese & Thai restaurant in Vilvoorde, Belgium. Features an interactive menu, online takeaway ordering with email OTP verification, table reservations, event inquiries, and an admin dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5.8 (strict mode) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Email | Resend |
| Validation | Zod |
| i18n | Custom (FR/NL/EN with JSON dictionaries) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (public, RLS-protected)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, bypasses RLS)
- `RESEND_API_KEY` — Resend API key for transactional emails
- `RESEND_FROM_EMAIL` — Verified sender email
- `RESTAURANT_EMAIL` — Where order/event notifications are sent
- `IMPERIAL_ADMIN_PASSWORD` — Shared password for admin dashboard

### 3. Run the dev server

```bash
npm run dev
```

The site runs at `http://localhost:3000`.

## Email Configuration

The site sends transactional emails via [Resend](https://resend.com) for orders, reservations, and event inquiries. Emails are sent to both customers and the restaurant.

### Setup

1. **Sign up for Resend** at https://resend.com and create an API key
2. **Verify a sender email** in Resend (usually your restaurant's email)
3. **Set environment variables:**
   - `RESEND_API_KEY` — Your Resend API key
   - `RESEND_FROM_EMAIL` — The verified sender email (e.g., `noreply@restaurant-imperial.be`)
   - `RESTAURANT_EMAIL` — Where order/reservation/event notifications are sent (e.g., `kitchen@restaurant-imperial.be`)

### Email Types

| Event | Customer Email | Restaurant Email |
|-------|---|---|
| **Takeaway Order (Cash)** | Order confirmation with items & total | Order details + customer contact |
| **Takeaway Order (Card)** | Order confirmation with Stripe payment receipt | Order details + customer contact |
| **Table Reservation** | Reservation confirmation with date/time | Reservation details + customer contact + phone |
| **Event Inquiry** | Form confirmation with event details | Inquiry details + customer contact + event type |

### Stripe Payment Integration

When customers pay via card for takeaway orders:
1. Customer completes Stripe payment via Payment Element
2. PaymentIntent is verified server-side (`payment_method='card'`)
3. Email confirmation sent to both customer and restaurant
4. Stripe webhooks optional (app verifies intent status directly)

### Resend Best Practices

- Emails are sent **fire-and-forget** (non-blocking) to avoid slowing down API responses
- Failed email sends are logged but don't fail the order/reservation
- All user input in emails is HTML-escaped to prevent injection
- Emails use consistent HTML templates matching the restaurant brand

### 4. Build for production

```bash
npm run build
npm start
```

## Database Schema

The app expects these Supabase tables:
- `imperial_categories` — menu categories (id, sort_order)
- `imperial_category_translations` — category names per locale
- `imperial_items` — menu items (price_restaurant, price_takeaway, active, is_featured, etc.)
- `imperial_item_translations` — item names/descriptions per locale
- `imperial_reservations` — table reservation requests
- `imperial_orders` — takeaway orders
- `imperial_event_requests` — event inquiry submissions
- `imperial_otps` — OTP codes (code_hash, attempts, expires_at, used)
- `imperial_admin_sessions` — admin session tokens (token_hash, expires_at)

RLS policies should allow public reads on menu data and public inserts on reservations/orders/OTPs. Admin operations use the service-role key.

## Architecture

- **`app/api/`** — Route handlers for OTP, reservations, orders, event contacts, and admin CRUD
- **`lib/`** — Shared server utilities (Supabase clients, validation schemas, OTP helper, admin auth)
- **`components/`** — React components (server + client)
- **`lib/i18n/`** — Language context and trilingual dictionaries

### Security

- Rate limiting via `middleware.ts` (per-route limits)
- OTP codes generated with `crypto.randomInt`, stored as SHA-256 hashes
- Brute-force lockout after 5 failed OTP attempts
- Admin password compared with `timingSafeEqual` (constant-time)
- Admin session tokens stored as SHA-256 hashes
- All user input validated with Zod schemas
- HTML escaping in all transactional emails
- Service-role key isolated to admin routes only

## Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite |
