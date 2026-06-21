import { redirect } from 'next/navigation';
import { createUserServerClient } from '@/lib/supabase-ssr';
import Navbar from '@/components/Navbar';
import AccountView from '@/components/AccountView';

export const dynamic = 'force-dynamic';

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
    <div className="min-h-screen bg-bg">
      <Navbar />
      <AccountView
        initialName={fullName}
        email={user.email ?? ''}
        orders={(orders ?? []) as any}
        reservations={(reservations ?? []) as any}
        activeTab={activeTab}
      />
    </div>
  );
}
