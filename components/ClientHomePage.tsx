'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ScrollReveal from '@/components/ScrollReveal';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import FeaturedDishes from '@/components/FeaturedDishes';
import Menu from '@/components/Menu';
import Events from '@/components/Events';
import ReviewsCarousel from '@/components/ReviewsCarousel';
import FindUs from '@/components/FindUs';
import Reservation from '@/components/Reservation';
import Footer from '@/components/Footer';
import TakeawayPanel from '@/components/TakeawayPanel';
import FixedMenus from '@/components/FixedMenus';
import type { Category, Dish } from '@/lib/types';

export default function ClientHomePage() {
  const { locale, dict } = useLanguage();
  const [menuData, setMenuData] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/menu?locale=${locale}`, { signal: controller.signal })
      .then(r => r.json())
      .then(({ categories, featured }) => {
        setMenuData(categories || []);
        setFeatured(featured || []);
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
      <ScrollReveal>
        <FeaturedDishes dict={dict.featured} dishes={featured} />
      </ScrollReveal>
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
    </>
  );
}
