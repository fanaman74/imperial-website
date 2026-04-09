import type { Metadata } from 'next';
import { Playfair_Display, Inter, Chango } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { OrderProvider } from '@/components/OrderProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

const playfair = Playfair_Display({
  subsets: ['latin'],
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

export const metadata: Metadata = {
  title: 'Restaurant Imperial — Cuisine Chinoise & Thaïlandaise | Vilvoorde',
  description: 'Restaurant Imperial — La cuisine Chinoise & Thaïlandaise de Vilvoorde. Dim Sum, Canard Laqué, Ti-Pan, Wok et plus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${playfair.variable} ${inter.variable} ${chango.variable}`}>
      <body className="font-body bg-bg text-text">
        <LanguageProvider>
          <ThemeProvider>
            <OrderProvider>
              {children}
            </OrderProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
