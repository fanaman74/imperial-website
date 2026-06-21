import { escapeHtml } from './utils';
import type { Locale } from './i18n/config';
import type { PricedItem } from './orders';

interface OrderEmailStrings {
  restaurantSubtitle: string;
  customerSubtitle: string;
  greeting: (firstName: string) => string;
  qty: string;
  article: string;
  price: string;
  total: string;
  phoneLabel: string;
  customerSubject: string;
  restaurantSubject: (name: string, total: string) => string;
}

const i18n: Record<Locale, OrderEmailStrings> = {
  fr: {
    restaurantSubtitle: 'Nouvelle commande traiteur',
    customerSubtitle: 'Confirmation de commande',
    greeting: (n) => `Bonjour ${n},<br>Merci pour votre commande !`,
    qty: 'Qté',
    article: 'Article',
    price: 'Prix',
    total: 'Total',
    phoneLabel: 'Tél',
    customerSubject: 'Votre commande chez Imperial — confirmation',
    restaurantSubject: (name, total) => `Commande traiteur — ${name} (${total}€)`,
  },
  nl: {
    restaurantSubtitle: 'Nieuwe afhaalbestelling',
    customerSubtitle: 'Bevestiging van uw bestelling',
    greeting: (n) => `Hallo ${n},<br>Bedankt voor uw bestelling!`,
    qty: 'Aantal',
    article: 'Artikel',
    price: 'Prijs',
    total: 'Totaal',
    phoneLabel: 'Tel',
    customerSubject: 'Uw bestelling bij Imperial — bevestiging',
    restaurantSubject: (name, total) => `Afhaalbestelling — ${name} (${total}€)`,
  },
  en: {
    restaurantSubtitle: 'New takeaway order',
    customerSubtitle: 'Order confirmation',
    greeting: (n) => `Hello ${n},<br>Thank you for your order!`,
    qty: 'Qty',
    article: 'Item',
    price: 'Price',
    total: 'Total',
    phoneLabel: 'Tel',
    customerSubject: 'Your Imperial order — confirmation',
    restaurantSubject: (name, total) => `Takeaway order — ${name} (${total}€)`,
  },
};

export interface OrderEmailInput {
  locale?: Locale;
  customerName: string;
  email: string;
  phone?: string;
  items: PricedItem[];
  total: number;
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

/**
 * Build the localized customer + restaurant order emails.
 * Shared by /api/order (signed-in) and /api/otp/verify (guest) so the two
 * flows stay identical and stay in sync.
 */
export function buildOrderEmails(input: OrderEmailInput): { customer: BuiltEmail; restaurant: BuiltEmail } {
  const { customerName, email, phone, items, total } = input;
  const t = i18n[input.locale ?? 'fr'];

  const firstName = escapeHtml(customerName?.split(' ')[0] || customerName || '');
  const safeName = escapeHtml(customerName || '');
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || '');
  const totalStr = Number(total).toFixed(2);

  const itemRows = items
    .map((i) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0">${i.quantity}×</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0">${escapeHtml(i.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e8e0;text-align:right">${(i.price * i.quantity).toFixed(2)}€</td>
    </tr>`)
    .join('');

  const html = (forRestaurant: boolean) => `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1412">
      <div style="background:#c41e24;padding:24px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:2px">IMPERIAL</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">
          ${forRestaurant ? t.restaurantSubtitle : t.customerSubtitle}
        </p>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e8ddd4">
        ${forRestaurant
          ? `<p style="margin:0 0 16px"><strong>${safeName}</strong> — <a href="mailto:${safeEmail}" style="color:#c41e24">${safeEmail}</a>${safePhone ? ` — ${safePhone}` : ''}</p>`
          : `<p style="margin:0 0 16px">${t.greeting(firstName)}</p>`
        }
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">
          <thead>
            <tr style="background:#f0e8e0">
              <th style="padding:8px 12px;text-align:left;font-weight:600">${t.qty}</th>
              <th style="padding:8px 12px;text-align:left;font-weight:600">${t.article}</th>
              <th style="padding:8px 12px;text-align:right;font-weight:600">${t.price}</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px;font-weight:700;font-size:15px">${t.total}</td>
              <td style="padding:12px;font-weight:700;font-size:15px;text-align:right;color:#c41e24">${totalStr}€</td>
            </tr>
          </tfoot>
        </table>
        ${!forRestaurant ? `
          <div style="border-left:3px solid #c41e24;padding:12px 16px;background:#fdf8f5;font-size:13px;color:#6b5b4f">
            <strong style="color:#1a1412">Restaurant Imperial</strong><br>
            Romeinsesteenweg 220, 1800 Vilvoorde<br>
            ${t.phoneLabel} : <a href="tel:+3222670270" style="color:#c41e24">02 267 02 70</a>
          </div>` : ''}
      </div>
      <div style="padding:16px 32px;background:#f0e8e0;font-size:12px;color:#9a8878;text-align:center">
        Restaurant Imperial — Vilvoorde, Belgique
      </div>
    </div>`;

  return {
    restaurant: { subject: t.restaurantSubject(safeName, totalStr), html: html(true) },
    customer: { subject: t.customerSubject, html: html(false) },
  };
}
