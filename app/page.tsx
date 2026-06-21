import ClientHomePage from '@/components/ClientHomePage';
import { getMenuData, getFeaturedDishes } from '@/lib/menu';
import { defaultLocale } from '@/lib/i18n/config';

// ISR: render the menu into the initial HTML (for SEO) and revalidate hourly.
export const revalidate = 3600;

export default async function Page() {
  const [categories, featured] = await Promise.all([
    getMenuData(defaultLocale),
    getFeaturedDishes(defaultLocale),
  ]);

  return (
    <ClientHomePage
      initialCategories={categories}
      initialFeatured={featured}
      initialLocale={defaultLocale}
    />
  );
}
