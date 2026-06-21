import ClientHomePage from '@/components/ClientHomePage';
import { getMenuData } from '@/lib/menu';
import { defaultLocale } from '@/lib/i18n/config';

// ISR: render the menu into the initial HTML (for SEO) and revalidate hourly.
export const revalidate = 3600;

export default async function Page() {
  const categories = await getMenuData(defaultLocale);

  return (
    <ClientHomePage
      initialCategories={categories}
      initialLocale={defaultLocale}
    />
  );
}
