import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';
import { createUserServerClient } from '@/lib/supabase-ssr';
import { consumeOtp } from '@/lib/otp';
import { reservationSchema, authenticatedReservationSchema } from '@/lib/validation';
import { escapeHtml } from '@/lib/utils';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

function sendReservationEmails(
  email: string,
  firstName: string,
  lastName: string,
  phone: string | null,
  guests: number,
  date: string,
  time: string,
  specialRequests: string | null
) {
  const resendKey = process.env.RESEND_API_KEY;
  const restaurantEmail = process.env.RESTAURANT_EMAIL || 'imperial@restaurant.be';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const dateLabel = new Date(date).toLocaleDateString('fr-BE');
  const safeFirstName = escapeHtml(firstName);
  const safeLastName = escapeHtml(lastName);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || '');
  const safeRequests = escapeHtml(specialRequests || '');

  const restaurantHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1412">
      <div style="background:#c41e24;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Nouvelle réservation de table</p>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f;width:40%">Nom</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;font-weight:600">${safeFirstName} ${safeLastName}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Email</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0"><a href="mailto:${safeEmail}" style="color:#c41e24">${safeEmail}</a></td></tr>
          ${safePhone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Téléphone</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0"><a href="tel:${safePhone}" style="color:#c41e24">${safePhone}</a></td></tr>` : ''}
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Date</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0"><strong>${escapeHtml(dateLabel)}</strong></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Heure</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0"><strong>${escapeHtml(time)}</strong></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Personnes</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0"><strong>${guests}</strong></td></tr>
          ${safeRequests ? `<tr><td style="padding:10px 0;color:#6b5b4f;vertical-align:top">Demandes spéciales</td><td style="padding:10px 0;white-space:pre-wrap">${safeRequests}</td></tr>` : ''}
        </table>
      </div>
      <div style="padding:16px 32px;background:#f0e8e0;font-size:12px;color:#9a8878;text-align:center">
        Restaurant Imperial — Vilvoorde, Belgique
      </div>
    </div>`;

  const customerHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1412">
      <div style="background:#c41e24;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Restaurant Chinois & Thaïlandais — Vilvoorde</p>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
        <h2 style="margin:0 0 16px;font-size:18px">Bonjour ${safeFirstName},</h2>
        <p style="color:#6b5b4f;line-height:1.7;margin:0 0 16px">
          Votre réservation pour <strong>${guests} ${guests === 1 ? 'personne' : 'personnes'}</strong> le <strong>${escapeHtml(dateLabel)} à ${escapeHtml(time)}</strong> a bien été enregistrée.
        </p>
        <p style="color:#6b5b4f;line-height:1.7;margin:0 0 24px">
          Nous vous demandons de confirmer votre présence dans les 48 heures avant votre réservation. En cas d'annulation, veuillez nous le signaler au plus tôt.
        </p>
        <div style="border-left:3px solid #c41e24;padding:12px 16px;background:#fdf8f5;font-size:13px;color:#6b5b4f">
          <strong style="color:#1a1412">Restaurant Imperial</strong><br>
          Romeinsesteenweg 220, 1800 Vilvoorde<br>
          Tél: <a href="tel:+3222670270" style="color:#c41e24">02 267 02 70</a>
        </div>
      </div>
      <div style="padding:16px 32px;background:#f0e8e0;font-size:12px;color:#9a8878;text-align:center">
        Vous recevez cet email car vous avez effectué une réservation via notre site web.
      </div>
    </div>`;

  Promise.all([
    resend.emails.send({
      from: `Imperial Website <${fromEmail}>`,
      to: [restaurantEmail],
      subject: `Nouvelle réservation — ${firstName} ${lastName} (${guests} ${guests === 1 ? 'personne' : 'personnes'})`,
      html: restaurantHtml,
      replyTo: email,
    }),
    resend.emails.send({
      from: `Restaurant Imperial <${fromEmail}>`,
      to: [email],
      subject: `Votre réservation chez Imperial — ${dateLabel} à ${time}`,
      html: customerHtml,
    }),
  ]).catch(err => console.error('Reservation email send error:', err));
}

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
      sendReservationEmails(user.email, firstName, lastName || '', phone || null, guests, date, time, specialRequests || null);
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
    sendReservationEmails(email, firstName, lastName || '', phone || null, guests, date, time, specialRequests || null);
    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    console.error('Reservation error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
