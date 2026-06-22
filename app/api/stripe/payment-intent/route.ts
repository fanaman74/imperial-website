import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createUserServerClient } from '@/lib/supabase-ssr';
import { recomputeOrder, OrderPricingError } from '@/lib/orders';
import { paymentIntentRequestSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
      metadata: { userId: user.id },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    console.error('payment-intent route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
