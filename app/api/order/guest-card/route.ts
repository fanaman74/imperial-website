import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase-server';
import { recomputeOrder, OrderPricingError } from '@/lib/orders';
import { buildOrderEmails } from '@/lib/order-email';
import { guestCardOrderSchema } from '@/lib/validation';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
      if (orderError.code === '23505') {
        return NextResponse.json({ error: 'Order already placed' }, { status: 409 });
      }
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
