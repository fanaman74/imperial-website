import { getMenuData, getFeaturedDishes } from '@/lib/menu';
import type { Locale } from '@/lib/i18n/config';
import { LOCALES } from '@/lib/validation';

// ISR: revalidate every 60 seconds instead of force-dynamic
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get('locale') || 'fr';
  const locale = (LOCALES.includes(localeParam as typeof LOCALES[number]) ? localeParam : 'fr') as Locale;

  const [categories, featured] = await Promise.all([
    getMenuData(locale),
    getFeaturedDishes(locale),
  ]);

  return Response.json({ categories, featured });
}
