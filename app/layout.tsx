import type { Metadata } from 'next';
import { Chelsea_Market, Inter, Chango } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { OrderProvider } from '@/components/OrderProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { UserProvider } from '@/components/UserProvider';

const chelseaMarket = Chelsea_Market({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-playfair',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const chango = Chango({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-chango',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://restaurant-imperial.be';
const SITE_DESCRIPTION =
  'Restaurant Imperial — La cuisine Chinoise & Thaïlandaise de Vilvoorde. Dim Sum, Canard Laqué, Ti-Pan, Wok et plus. Commande à emporter et réservations.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Restaurant Imperial — Cuisine Chinoise & Thaïlandaise | Vilvoorde',
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  keywords: ['restaurant chinois', 'restaurant thaïlandais', 'Vilvoorde', 'traiteur', 'dim sum', 'canard laqué', 'à emporter'],
  openGraph: {
    type: 'website',
    locale: 'fr_BE',
    url: '/',
    siteName: 'Restaurant Imperial',
    title: 'Restaurant Imperial — Cuisine Chinoise & Thaïlandaise | Vilvoorde',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Restaurant Imperial — Cuisine Chinoise & Thaïlandaise | Vilvoorde',
    description: SITE_DESCRIPTION,
  },
};

// schema.org Restaurant structured data — powers Google rich results & Maps panel.
const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'Restaurant Imperial',
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  servesCuisine: ['Chinese', 'Thai'],
  priceRange: '€€',
  telephone: '+3222670270',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Romeinsesteenweg 220',
    addressLocality: 'Vilvoorde',
    postalCode: '1800',
    addressCountry: 'BE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 50.9278,
    longitude: 4.4185,
  },
  acceptsReservations: 'True',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '11:30',
      closes: '14:30',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '17:30',
      closes: '22:00',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${chelseaMarket.variable} ${inter.variable} ${chango.variable}`}>
      <body className="font-body bg-bg text-text">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
        <LanguageProvider>
          <ThemeProvider>
            <UserProvider>
              <OrderProvider>
                {children}
              </OrderProvider>
            </UserProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
