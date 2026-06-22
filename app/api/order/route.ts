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
      if (pi.metadata?.userId !== user.id) {
        return NextResponse.json({ error: 'Payment mismatch' }, { status: 400 });
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
      if (orderError.code === '23505') {
        return NextResponse.json({ error: 'Order already placed' }, { status: 409 });
      }
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
