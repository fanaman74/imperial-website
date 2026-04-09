import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/lib/admin-auth';
import AdminNav from './AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('imperial_admin_token')?.value;
  const isAuthenticated = token ? await verifyAdminSession(token) : false;

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
