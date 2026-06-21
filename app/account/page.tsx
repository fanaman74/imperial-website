import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createUserServerClient } from '@/lib/supabase-ssr';
import ProfileForm from '@/components/ProfileForm';
import ReorderButton from '@/components/ReorderButton';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-300',
  confirmed: 'bg-blue-900/30 text-blue-300',
  preparing: 'bg-orange-900/30 text-orange-300',
  ready: 'bg-green-900/30 text-green-300',
  completed: 'bg-green-900/30 text-green-300',
  cancelled: 'bg-red-900/30 text-red-300',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createUserServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/?signin=1');
  }

  const { tab } = await searchParams;
  const activeTab = tab === 'reservations' ? 'reservations' : 'orders';

  const [{ data: orders }, { data: reservations }] = await Promise.all([
    supabase
      .from('imperial_orders')
      .select('id, created_at, total, status, items')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('imperial_reservations')
      .select('id, created_at, date, time, guests, status, first_name, last_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';

  return (
    <div className="min-h-screen bg-bg pt-[72px]">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <h1 className="font-display text-3xl italic">My account</h1>

        <ProfileForm initialName={fullName} email={user.email ?? ''} />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-8">
          <Link
            href="/account?tab=orders"
            className={`px-4 py-2 text-sm transition-colors ${activeTab === 'orders' ? 'text-accent border-b-2 border-accent -mb-px' : 'text-text-muted hover:text-text'}`}
          >
            Orders {orders?.length ? `(${orders.length})` : ''}
          </Link>
          <Link
            href="/account?tab=reservations"
            className={`px-4 py-2 text-sm transition-colors ${activeTab === 'reservations' ? 'text-accent border-b-2 border-accent -mb-px' : 'text-text-muted hover:text-text'}`}
          >
            Reservations {reservations?.length ? `(${reservations.length})` : ''}
          </Link>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {!orders?.length ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-text-muted">No orders yet.</p>
                <Link href="/takeaway" className="text-accent hover:underline text-sm">
                  Order takeaway →
                </Link>
              </div>
            ) : (
              orders.map(order => {
                const items = order.items as { id: string; name: string; quantity: number; price: number }[];
                return (
                  <div key={order.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Order header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
                      <div>
                        <span className="text-sm font-medium">
                          {new Date(order.created_at).toLocaleDateString('fr-BE', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </span>
                        <span className="text-text-muted text-xs ml-2">
                          {new Date(order.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-surface text-text-muted'}`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="px-5 py-4 space-y-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>
                            <span className="font-medium">{item.quantity}×</span>{' '}
                            <span className="text-text">{item.name}</span>
                          </span>
                          <span className="text-text-muted tabular-nums">{(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer: total + reorder */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface/50">
                      <ReorderButton items={items} />
                      <span className="text-sm font-semibold text-accent tabular-nums">
                        {Number(order.total).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="space-y-4">
            {!reservations?.length ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-text-muted">No reservations yet.</p>
                <Link href="/#contact" className="text-accent hover:underline text-sm">
                  Make a reservation →
                </Link>
              </div>
            ) : (
              reservations.map(res => (
                <div key={res.id} className="bg-surface rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(res.date).toLocaleDateString('fr-BE', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })} at {res.time}
                      </p>
                      <p className="text-text-muted text-sm mt-1">{res.guests} guests</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[res.status] || 'bg-surface text-text-muted'}`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
