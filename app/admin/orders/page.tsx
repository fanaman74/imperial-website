import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { verifyAdminSession } from '@/lib/admin-auth';
import StatusDropdown from '../StatusDropdown';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('imperial_admin_token')?.value;
  if (!token || !(await verifyAdminSession(token))) {
    redirect('/admin/login');
  }

  const supabase = createServerClient();
  const { data: orders } = await supabase
    .from('imperial_orders')
    .select('*')
    .order('created_at', { ascending: false });

  const total = orders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;
  const pending = orders?.filter((o) => !o.status || o.status === 'pending').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-display text-accent">Orders</h1>
        <div className="flex items-center gap-6 text-sm text-text-muted">
          <span>{orders?.length ?? 0} total</span>
          {pending > 0 && (
            <span className="text-accent font-medium">{pending} pending</span>
          )}
          <span className="font-medium text-text">{total.toFixed(2)}€ all-time</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-left">
              <th className="pb-2 pr-4 whitespace-nowrap">Date &amp; Time</th>
              <th className="pb-2 pr-4">Customer</th>
              <th className="pb-2 pr-4">Contact</th>
              <th className="pb-2 pr-4">Items</th>
              <th className="pb-2 pr-4 text-right">Total</th>
              <th className="pb-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders || []).map((o: any) => (
                <tr key={o.id} className="border-t border-border/50 align-top">
                  <td className="py-3 pr-4 whitespace-nowrap text-text-muted">
                    <div>{new Date(o.created_at).toLocaleDateString('fr-BE')}</div>
                    <div className="text-xs">{new Date(o.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="py-3 pr-4 font-medium whitespace-nowrap">{o.name || '—'}</td>
                  <td className="py-3 pr-4">
                    {o.email && <div className="text-text-muted text-xs">{o.email}</div>}
                    {o.phone && <div className="text-text-muted text-xs">{o.phone}</div>}
                  </td>
                  <td className="py-3 pr-4">
                    {Array.isArray(o.items) && o.items.length > 0 ? (
                      <ul className="space-y-0.5">
                        {o.items.map((item: any, i: number) => (
                          <li key={i} className="text-xs text-text-muted">
                            <span className="font-medium text-text">{item.quantity}×</span> {item.name}
                            <span className="ml-1 text-text-muted/60">({(item.price * item.quantity).toFixed(2)}€)</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold whitespace-nowrap">
                    {Number(o.total).toFixed(2)}€
                  </td>
                  <td className="py-3 pr-4">
                    <StatusDropdown
                      id={o.id}
                      currentStatus={o.status || 'pending'}
                      endpoint="/api/admin/orders"
                      options={['pending', 'preparing', 'ready', 'completed', 'cancelled']}
                    />
                  </td>
                </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={6} className="py-8 text-text-muted text-center">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
