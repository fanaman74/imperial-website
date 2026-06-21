'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useOrder } from './OrderProvider';
import { createBrowserClient } from '@/lib/supabase-browser';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-300',
  confirmed: 'bg-blue-900/30 text-blue-300',
  preparing: 'bg-orange-900/30 text-orange-300',
  ready: 'bg-green-900/30 text-green-300',
  completed: 'bg-green-900/30 text-green-300',
  cancelled: 'bg-red-900/30 text-red-300',
};

interface OrderItem { id: string; name: string; quantity: number; price: number; }
interface Order { id: string; created_at: string; total: number; status: string; items: OrderItem[]; }
interface Reservation { id: string; created_at: string; date: string; time: string; guests: number; status: string; }

interface Props {
  initialName: string;
  email: string;
  orders: Order[];
  reservations: Reservation[];
  activeTab: 'orders' | 'reservations';
}

function ReorderButton({ items, label, doneLabel }: { items: OrderItem[]; label: string; doneLabel: string }) {
  const { addItem } = useOrder();
  const [done, setDone] = useState(false);

  function handleReorder() {
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addItem({ id: item.id, name: item.name, desc: '', price: item.price });
      }
    });
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      onClick={handleReorder}
      className={`text-xs px-3 py-1.5 border rounded transition-colors ${
        done ? 'border-green-500/50 text-green-400' : 'border-accent/50 text-accent hover:bg-accent hover:text-bg'
      }`}
    >
      {done ? doneLabel : label}
    </button>
  );
}

function ProfileSection({ initialName, email }: { initialName: string; email: string }) {
  const { dict } = useLanguage();
  const t = (dict as any).account;
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setSaved(false);
    const supabase = createBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (err) { setError(err.message); } else { setSaved(true); }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSave} className="bg-surface rounded-lg p-6 space-y-4">
      <h2 className="text-sm uppercase tracking-wider text-text-muted">{t.profile}</h2>
      <div>
        <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Email</label>
        <p className="text-sm py-2.5 text-text-muted">{email}</p>
      </div>
      <div>
        <label htmlFor="fullName" className="block text-xs text-text-muted mb-1 uppercase tracking-wider">{t.fullName}</label>
        <input
          id="fullName"
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false); }}
          className="w-full bg-bg border border-border rounded px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          placeholder={t.namePlaceholder}
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {saved && <p className="text-green-400 text-sm">{t.saved}</p>}
      <button type="submit" disabled={loading}
        className="px-5 py-2 bg-accent text-bg rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
        {loading ? t.saving : t.save}
      </button>
    </form>
  );
}

export default function AccountView({ initialName, email, orders, reservations, activeTab }: Props) {
  const { dict, locale } = useLanguage();
  const t = (dict as any).account;

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale === 'en' ? 'en-GB' : 'fr-BE', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  const timeFmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale === 'nl' ? 'nl-BE' : locale === 'en' ? 'en-GB' : 'fr-BE', {
      hour: '2-digit', minute: '2-digit',
    });
  const resFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale === 'en' ? 'en-GB' : 'fr-BE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
      <h1 className="font-display text-3xl italic">{t.title}</h1>

      <ProfileSection initialName={initialName} email={email} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <Link href="/account?tab=orders"
          className={`px-4 py-2 text-sm transition-colors ${activeTab === 'orders' ? 'text-accent border-b-2 border-accent -mb-px' : 'text-text-muted hover:text-text'}`}>
          {t.tabOrders} {orders.length ? `(${orders.length})` : ''}
        </Link>
        <Link href="/account?tab=reservations"
          className={`px-4 py-2 text-sm transition-colors ${activeTab === 'reservations' ? 'text-accent border-b-2 border-accent -mb-px' : 'text-text-muted hover:text-text'}`}>
          {t.tabReservations} {reservations.length ? `(${reservations.length})` : ''}
        </Link>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-6">
          {!orders.length ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-text-muted">{t.noOrders}</p>
              <Link href="/takeaway" className="text-accent hover:underline text-sm">{t.orderTakeaway}</Link>
            </div>
          ) : orders.map(order => (
            <div key={order.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
                <div>
                  <span className="text-sm font-medium">{dateFmt(order.created_at)}</span>
                  <span className="text-text-muted text-xs ml-2">{timeFmt(order.created_at)}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-surface text-text-muted'}`}>
                  {t.statusLabels?.[order.status] || order.status}
                </span>
              </div>
              <div className="px-5 py-4 space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span><span className="font-medium">{item.quantity}×</span> {item.name}</span>
                    <span className="text-text-muted tabular-nums">{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface/50">
                <ReorderButton items={order.items} label={t.reorder} doneLabel={t.reordered} />
                <span className="text-sm font-semibold text-accent tabular-nums">{Number(order.total).toFixed(2)}€</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="space-y-4">
          {!reservations.length ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-text-muted">{t.noReservations}</p>
              <Link href="/#contact" className="text-accent hover:underline text-sm">{t.makeReservation}</Link>
            </div>
          ) : reservations.map(res => (
            <div key={res.id} className="bg-surface rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{resFmt(res.date)} {t.at} {res.time}</p>
                  <p className="text-text-muted text-sm mt-1">{res.guests} {t.guests}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[res.status] || 'bg-surface text-text-muted'}`}>
                  {t.statusLabels?.[res.status] || res.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
