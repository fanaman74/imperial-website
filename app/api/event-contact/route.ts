import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';
import { consumeOtp } from '@/lib/otp';
import { eventContactSchema, EVENT_TYPES } from '@/lib/validation';
import { escapeHtml } from '@/lib/utils';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const EVENT_TYPE_LABELS: Record<string, string> = {
  birthday: 'Anniversaire',
  corporate: "Repas d'entreprise",
  wedding: 'Mariage / Fiançailles',
  family: 'Repas de famille',
  catering: 'Traiteur à domicile',
  other: 'Autre',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = eventContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { first_name, last_name, email, phone, event_type, event_date, guests, message, code } = parsed.data;

    // Verify and consume OTP
    const otpResult = await consumeOtp(email, code);
    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.reason }, { status: 400 });
    }

    const supabase = createPublicClient();
    const { error: dbError } = await supabase.from('imperial_event_requests').insert({
      first_name, last_name, email,
      phone: phone || null,
      event_type,
      event_date: event_date || null,
      guests: guests ? parseInt(String(guests), 10) : null,
      message: message || null,
      status: 'pending',
    });

    if (dbError) {
      console.error('Event request insert error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Send notification emails — fire and forget
    const resendKey = process.env.RESEND_API_KEY;
    const restaurantEmail = process.env.RESTAURANT_EMAIL || 'imperial@restaurant.be';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (resendKey) {
      const resend = new Resend(resendKey);
      const typeLabel = EVENT_TYPE_LABELS[event_type] || event_type;
      const dateLabel = event_date ? new Date(event_date).toLocaleDateString('fr-BE') : '—';

      const safeFirstName = escapeHtml(first_name);
      const safeLastName = escapeHtml(last_name);
      const safeEmail = escapeHtml(email);
      const safePhone = escapeHtml(phone || '');
      const safeTypeLabel = escapeHtml(typeLabel);
      const safeMessage = escapeHtml(message || '');

      const restaurantHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1412">
          <div style="background:#c41e24;padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Nouvelle demande d'événement</p>
          </div>
          <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f;width:40%">Nom</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;font-weight:600">${safeFirstName} ${safeLastName}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Email</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0"><a href="mailto:${safeEmail}" style="color:#c41e24">${safeEmail}</a></td></tr>
              ${safePhone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Téléphone</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0"><a href="tel:${safePhone}" style="color:#c41e24">${safePhone}</a></td></tr>` : ''}
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Type</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0">${safeTypeLabel}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Date souhaitée</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0">${escapeHtml(dateLabel)}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8e0;color:#6b5b4f">Personnes</td><td style="padding:10px 0;border-bottom:1px solid #f0e8e0">${escapeHtml(String(guests || '—'))}</td></tr>
              ${safeMessage ? `<tr><td style="padding:10px 0;color:#6b5b4f;vertical-align:top">Message</td><td style="padding:10px 0;white-space:pre-wrap">${safeMessage}</td></tr>` : ''}
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
              Nous avons bien reçu votre demande pour un <strong>${safeTypeLabel}</strong>${event_date ? ` le <strong>${escapeHtml(dateLabel)}</strong>` : ''}${guests ? ` pour <strong>${escapeHtml(String(guests))} personnes</strong>` : ''}.
            </p>
            <p style="color:#6b5b4f;line-height:1.7;margin:0 0 24px">
              Notre équipe vous contactera dans les plus brefs délais pour confirmer les détails de votre événement.
            </p>
            <div style="border-left:3px solid #c41e24;padding:12px 16px;background:#fdf8f5;font-size:13px;color:#6b5b4f">
              <strong style="color:#1a1412">Restaurant Imperial</strong><br>
              Romeinsesteenweg 220, 1800 Vilvoorde<br>
              Tél: <a href="tel:+3222670270" style="color:#c41e24">02 267 02 70</a>
            </div>
          </div>
          <div style="padding:16px 32px;background:#f0e8e0;font-size:12px;color:#9a8878;text-align:center">
            Vous recevez cet email car vous avez soumis une demande via notre site web.
          </div>
        </div>`;

      // Fire-and-forget emails
      Promise.all([
        resend.emails.send({
          from: `Imperial Website <${fromEmail}>`,
          to: [restaurantEmail],
          subject: `Nouvelle demande — ${typeLabel} (${first_name} ${last_name})`,
          html: restaurantHtml,
          replyTo: email,
        }),
        resend.emails.send({
          from: `Restaurant Imperial <${fromEmail}>`,
          to: [email],
          subject: `Votre demande d'événement chez Imperial — confirmation`,
          html: customerHtml,
        }),
      ]).catch(err => console.error('Event email send error:', err));
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Event contact error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
