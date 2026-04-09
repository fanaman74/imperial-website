import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const { email, code, customerName, customerPhone, items, total, locale } = await req.json();

    if (!email || !code || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: otps } = await supabase
      .from('imperial_otps')
      .select('id, code, expires_at, used')
      .eq('email', email)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const otp = otps?.[0];
    if (!otp) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    if (otp.code !== code) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    if (new Date(otp.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 400 });

    await supabase.from('imperial_otps').update({ used: true }).eq('id', otp.id);

    const { data: order, error: orderError } = await supabase
      .from('imperial_orders')
      .insert({
        name: customerName,
        email,
        phone: customerPhone || null,
        items,
        total,
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
      const firstName = customerName?.split(' ')[0] || customerName;

      const itemRows = items
        .map((i: any) => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0">${i.quantity}×</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0">${i.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0;text-align:right">${(i.price * i.quantity).toFixed(2)}€</td>
        </tr>`)
        .join('');

      const orderHtml = (forRestaurant: boolean) => `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1412">
          <div style="background:#c41e24;padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">
              ${forRestaurant ? 'Nouvelle commande traiteur' : 'Confirmation de commande'}
            </p>
          </div>
          <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
            ${forRestaurant
              ? `<p style="margin:0 0 16px"><strong>${customerName}</strong> — <a href="mailto:${email}" style="color:#c41e24">${email}</a>${customerPhone ? ` — ${customerPhone}` : ''}</p>`
              : `<p style="margin:0 0 16px">Bonjour ${firstName},<br>Merci pour votre commande !</p>`
            }
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">
              <thead>
                <tr style="background:#f0e8e0">
                  <th style="padding:8px 12px;text-align:left;font-weight:600">Qté</th>
                  <th style="padding:8px 12px;text-align:left;font-weight:600">Article</th>
                  <th style="padding:8px 12px;text-align:right;font-weight:600">Prix</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:12px;font-weight:700;font-size:15px">Total</td>
                  <td style="padding:12px;font-weight:700;font-size:15px;text-align:right;color:#c41e24">${Number(total).toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>
            ${!forRestaurant ? `
              <div style="border-left:3px solid #c41e24;padding:12px 16px;background:#fdf8f5;font-size:13px;color:#6b5b4f">
                <strong style="color:#1a1412">Restaurant Imperial</strong><br>
                Romeinsesteenweg 220, 1800 Vilvoorde<br>
                Tél : <a href="tel:+3222670270" style="color:#c41e24">02 267 02 70</a>
              </div>` : ''}
          </div>
          <div style="padding:16px 32px;background:#f0e8e0;font-size:12px;color:#9a8878;text-align:center">
            Restaurant Imperial — Vilvoorde, Belgique
          </div>
        </div>`;

      await Promise.all([
        resend.emails.send({
          from: `Imperial Website <${fromEmail}>`,
          to: [restaurantEmail],
          subject: `Commande traiteur — ${customerName} (${Number(total).toFixed(2)}€)`,
          html: orderHtml(true),
          replyTo: email,
        }),
        resend.emails.send({
          from: `Restaurant Imperial <${fromEmail}>`,
          to: [email],
          subject: `Votre commande chez Imperial — confirmation`,
          html: orderHtml(false),
        }),
      ]).catch(err => console.error('Email send error:', err));
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
