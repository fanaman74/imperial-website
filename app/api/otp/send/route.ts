import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-server';
import { hashToken, escapeHtml } from '@/lib/utils';
import { otpSendSchema } from '@/lib/validation';
import { OTP_TTL_MS } from '@/lib/otp';
import { randomInt } from 'crypto';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

function generateOTP(): string {
  return randomInt(100000, 1000000).toString();
}

const i18n = {
  fr: {
    subject: (code: string) => `${code} — Votre code de vérification Imperial`,
    greeting: (name: string) => name ? `Bonjour ${name},` : '',
    body: 'Voici votre code pour confirmer votre commande en ligne :',
    expiry: 'Ce code expire dans <strong>10 minutes</strong>.',
    ignore: 'Si vous n’avez pas passé de commande, ignorez cet email.',
  },
  nl: {
    subject: (code: string) => `${code} — Uw verificatiecode Imperial`,
    greeting: (name: string) => name ? `Hallo ${name},` : '',
    body: 'Hier is uw code om uw bestelling te bevestigen :',
    expiry: 'Deze code vervalt over <strong>10 minuten</strong>.',
    ignore: 'Als u geen bestelling heeft geplaatst, kunt u deze e-mail negeren.',
  },
  en: {
    subject: (code: string) => `${code} — Your Imperial verification code`,
    greeting: (name: string) => name ? `Hello ${name},` : '',
    body: 'Here is your code to confirm your order:',
    expiry: 'This code expires in <strong>10 minutes</strong>.',
    ignore: 'If you didn’t place an order, you can ignore this email.',
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = otpSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { email, name, locale } = parsed.data;
    const lang = i18n[locale ?? 'fr'];

    const code = generateOTP();
    const codeHash = hashToken(code.toLowerCase());
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const supabase = createPublicClient();
    await supabase.from('imperial_otps').update({ used: true }).eq('email', email).eq('used', false);

    const { error: dbError } = await supabase.from('imperial_otps').insert({
      email,
      code_hash: codeHash,
      attempts: 0,
      used: false,
      expires_at: expiresAt.toISOString(),
    });
    if (dbError) {
      console.error('OTP insert error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!resendKey) {
      console.log(`[DEV] OTP for ${email}: ${code}`);
      return NextResponse.json({ success: true, dev: true });
    }

    const resend = new Resend(resendKey);
    const firstName = escapeHtml(name?.split(' ')[0] || '');
    const greeting = lang.greeting(firstName);

    const { error: emailError } = await resend.emails.send({
      from: `Restaurant Imperial <${fromEmail}>`,
      to: [email],
      subject: lang.subject(code),
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1412">
          <div style="background:#c41e24;padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Restaurant Chinois &amp; Thaïlandais — Vilvoorde</p>
          </div>
          <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
            ${greeting ? `<p style="margin:0 0 16px;font-size:15px">${greeting}</p>` : ''}
            <p style="margin:0 0 24px;color:#6b5b4f;line-height:1.6">${lang.body}</p>
            <div style="text-align:center;margin:0 0 24px">
              <span style="display:inline-block;background:#fdf2f2;border:2px solid #c41e24;border-radius:8px;padding:16px 40px;font-size:36px;font-weight:700;letter-spacing:10px;color:#c41e24">
                ${code}
              </span>
            </div>
            <p style="margin:0;color:#9a8878;font-size:13px;text-align:center">
              ${lang.expiry}<br>${lang.ignore}
            </p>
          </div>
          <div style="padding:16px 32px;background:#f0e8e0;font-size:12px;color:#9a8878;text-align:center">
            Restaurant Imperial — Romeinsesteenweg 220, 1800 Vilvoorde
          </div>
        </div>`,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('OTP send error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
