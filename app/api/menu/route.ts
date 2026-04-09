import { getMenuData, getFeaturedDishes } from '@/lib/menu';
import type { Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') || 'fr') as Locale;

  const [categories, featured] = await Promise.all([
    getMenuData(locale),
    getFeaturedDishes(locale),
  ]);

  return Response.json({ categories, featured });
}
