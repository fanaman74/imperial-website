import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';
import { consumeOtp } from '@/lib/otp';
import { reservationSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { guests, date, time, firstName, lastName, email, phone, specialRequests, locale, code } = parsed.data;

    // Verify and consume OTP
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
