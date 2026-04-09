import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';
import StatusDropdown from './StatusDropdown';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('imperial_admin_token')?.value;
  if (!token || !(await verifyAdminSession(token))) {
    redirect('/admin/login');
  }

  const supabase = createServerClient();

  const [{ data: reservations }, { data: orders }, { data: events }] = await Promise.all([
    supabase.from('imperial_reservations').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('imperial_orders').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('imperial_event_requests').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  return (
    <div className="space-y-12">
      <h1 className="text-2xl font-display text-accent">Dashboard</h1>

      <section>
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          Event Requests
          {(events?.length ?? 0) > 0 && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-normal">
              {events!.filter((e: any) => e.status === 'pending').length} pending
            </span>
          )}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="pb-2 pr-4">Date received</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Contact</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Event date</th>
                <th className="pb-2 pr-4">Guests</th>
                <th className="pb-2 pr-4">Message</th>
                <th className="pb-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(events || []).map((ev: any) => (
                <tr key={ev.id} className="border-b border-border/50 align-top">
                  <td className="py-2 pr-4 whitespace-nowrap text-text-muted">{new Date(ev.created_at).toLocaleDateString('fr-BE')}</td>
                  <td className="py-2 pr-4 whitespace-nowrap font-medium">{ev.first_name} {ev.last_name}</td>
                  <td className="py-2 pr-4">
                    <div className="text-text-muted">{ev.email}</div>
                    {ev.phone && <div className="text-text-muted">{ev.phone}</div>}
                  </td>
                  <td className="py-2 pr-4 capitalize whitespace-nowrap">{ev.event_type}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{ev.event_date ? new Date(ev.event_date).toLocaleDateString('fr-BE') : '—'}</td>
                  <td className="py-2 pr-4">{ev.guests ?? '—'}</td>
                  <td className="py-2 pr-4 max-w-[200px]">
                    {ev.message ? <span className="text-text-muted line-clamp-2 text-xs leading-relaxed">{ev.message}</span> : <span className="text-border">—</span>}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusDropdown id={ev.id} currentStatus={ev.status || 'pending'} endpoint="/api/admin/event-requests" options={['pending', 'contacted', 'confirmed', 'cancelled']} />
                  </td>
                </tr>
              ))}
              {(!events || events.length === 0) && (
                <tr><td colSpan={8} className="py-4 text-text-muted text-center">No event requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Recent Reservations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Guests</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(reservations || []).map((r: any) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2 pr-4">{r.date}</td>
                  <td className="py-2 pr-4">{r.time}</td>
                  <td className="py-2 pr-4">{r.guests}</td>
                  <td className="py-2 pr-4">{r.first_name} {r.last_name}</td>
                  <td className="py-2 pr-4 text-text-muted">{r.email}</td>
                  <td className="py-2 pr-4">
                    <StatusDropdown id={r.id} currentStatus={r.status || 'pending'} endpoint="/api/admin/reservations" options={['pending', 'confirmed', 'cancelled', 'completed']} />
                  </td>
                </tr>
              ))}
              {(!reservations || reservations.length === 0) && (
                <tr><td colSpan={6} className="py-4 text-text-muted text-center">No reservations yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Items</th>
                <th className="pb-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((o: any) => (
                <tr key={o.id} className="border-b border-border/50">
                  <td className="py-2 pr-4">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-2 pr-4">{o.customer_name}</td>
                  <td className="py-2 pr-4">{Number(o.total).toFixed(2)}&euro;</td>
                  <td className="py-2 pr-4">{Array.isArray(o.items) ? o.items.length : 0}</td>
                  <td className="py-2 pr-4">
                    <StatusDropdown id={o.id} currentStatus={o.status || 'pending'} endpoint="/api/admin/orders" options={['pending', 'preparing', 'ready', 'completed', 'cancelled']} />
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr><td colSpan={5} className="py-4 text-text-muted text-center">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
