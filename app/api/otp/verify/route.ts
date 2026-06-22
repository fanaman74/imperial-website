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
