import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const supabase = createServerClient();
    await supabase.from('imperial_otps').update({ used: true }).eq('email', email).eq('used', false);

    const { error: dbError } = await supabase.from('imperial_otps').insert({
      email,
      code,
      expires_at: expiresAt.toISOString(),
    });
    if (dbError) return NextResponse.json({ error: 'Database error' }, { status: 500 });

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!resendKey) {
      console.log(`[DEV] OTP for ${email}: ${code}`);
      return NextResponse.json({ success: true, dev: true });
    }

    const resend = new Resend(resendKey);
    const firstName = name?.split(' ')[0] || '';

    const { error: emailError } = await resend.emails.send({
      from: `Restaurant Imperial <${fromEmail}>`,
      to: [email],
      subject: `${code} — Votre code de vérification Imperial`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1412">
          <div style="background:#c41e24;padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Restaurant Chinois & Thaïlandais — Vilvoorde</p>
          </div>
          <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
            ${firstName ? `<p style="margin:0 0 16px;font-size:15px">Bonjour ${firstName},</p>` : ''}
            <p style="margin:0 0 24px;color:#6b5b4f;line-height:1.6">
              Voici votre code pour confirmer votre commande en ligne :
            </p>
            <div style="text-align:center;margin:0 0 24px">
              <span style="display:inline-block;background:#fdf2f2;border:2px solid #c41e24;border-radius:8px;padding:16px 40px;font-size:36px;font-weight:700;letter-spacing:10px;color:#c41e24">
                ${code}
              </span>
            </div>
            <p style="margin:0;color:#9a8878;font-size:13px;text-align:center">
              Ce code expire dans <strong>10 minutes</strong>.<br>
              Si vous n'avez pas passé de commande, ignorez cet email.
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
