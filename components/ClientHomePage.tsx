'use client';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ScrollReveal from '@/components/ScrollReveal';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Menu from '@/components/Menu';
import Events from '@/components/Events';
import ReviewsCarousel from '@/components/ReviewsCarousel';
import FindUs from '@/components/FindUs';
import Reservation from '@/components/Reservation';
import Footer from '@/components/Footer';
import TakeawayPanel from '@/components/TakeawayPanel';
import CartSignInPrompt from '@/components/CartSignInPrompt';
import FixedMenus from '@/components/FixedMenus';
import type { Category } from '@/lib/types';

interface ClientHomePageProps {
  initialCategories: Category[];
  initialLocale: string;
}

export default function ClientHomePage({ initialCategories, initialLocale }: ClientHomePageProps) {
  const { locale, dict } = useLanguage();
  const [menuData, setMenuData] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  // Locale the current menuData was loaded for — seeded from the server render.
  const loadedLocale = useRef(initialLocale);

  useEffect(() => {
    // Server already rendered this locale's menu; no client fetch needed.
    if (locale === loadedLocale.current) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/menu?locale=${locale}`, { signal: controller.signal })
      .then(r => r.json())
      .then(({ categories }) => {
        setMenuData(categories || []);
        loadedLocale.current = locale;
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [locale]);

  return (
    <>
      <Navbar />
      <Hero dict={dict.hero} />
      <ScrollReveal><About dict={dict.about} /></ScrollReveal>
      {!loading && <Menu categories={menuData} dict={dict.menu} />}
      {loading && (
        <section id="menu" className="py-24 px-6 flex justify-center items-center min-h-[300px]">
          <span className="text-text-muted text-sm uppercase tracking-widest">
            {locale === 'nl' ? 'Laden…' : locale === 'en' ? 'Loading…' : 'Chargement…'}
          </span>
        </section>
      )}
      <ScrollReveal><FixedMenus /></ScrollReveal>
      <ScrollReveal><ReviewsCarousel /></ScrollReveal>
      <ScrollReveal><Events dict={dict.events} /></ScrollReveal>
      <ScrollReveal><FindUs dict={dict.findUs} /></ScrollReveal>
      <Reservation dict={dict.reservation} locale={locale} />
      <Footer dict={{ nav: dict.nav, findUs: dict.findUs, footer: dict.footer }} />
      <TakeawayPanel />
      <CartSignInPrompt />
    </>
  );
}
