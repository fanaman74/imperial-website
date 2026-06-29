'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import UserButton from '@/components/UserButton';

const navLinks = [
  { key: 'home', href: '#accueil', anchor: true },
  { key: 'menu', href: '#menu', anchor: true },
  { key: 'takeaway', href: '/takeaway', anchor: false },
  { key: 'events', href: '#evenements', anchor: true },
  { key: 'info', href: '#informations', anchor: true },
  { key: 'contact', href: '/event-contact', anchor: false },
];

const langs: Locale[] = ['fr', 'nl', 'en'];

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const { locale, dict, setLocale } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const isHome = pathname === '/';
  function resolveHref(link: typeof navLinks[0]) {
    if (!link.anchor) return link.href;
    return isHome ? link.href : `/${link.href}`;
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Focus trap + Escape key for mobile menu
  useEffect(() => {
    if (!menuOpen) return;

    const menu = menuRef.current;
    if (!menu) return;

    // Focus first focusable element
    const focusable = menu.querySelectorAll<HTMLElement>('a, button');
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-accent focus:text-bg focus:px-4 focus:py-2 focus:rounded focus:text-sm"
      >
        Skip to content
      </a>

      <nav className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center transition-all duration-[400ms] ease-in-out ${scrolled ? 'bg-bg/95 backdrop-blur-md border-b border-border' : 'bg-transparent'}`}>
        <div className="w-full max-w-[1200px] mx-auto px-6 flex items-center">
          <a href={isHome ? '#accueil' : '/'} className="font-display uppercase tracking-[0.15em] text-2xl text-accent no-underline" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>IMPERIAL</a>

          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            {navLinks.map(link => (
              <a
                key={link.key}
                href={resolveHref(link)}
                className={`text-sm uppercase tracking-wider hover:text-accent transition-colors font-medium ${pathname === link.href ? 'text-accent' : 'text-text'}`}
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                {(dict.nav as Record<string, string>)[link.key]}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 bg-bg-alt/80 rounded px-1 py-0.5">
              {langs.map(lng => (
                <button
                  key={lng}
                  onClick={() => setLocale(lng)}
                  className={`px-2.5 py-1 text-xs uppercase tracking-wider rounded transition-colors ${locale === lng ? 'bg-accent text-bg font-medium' : 'text-text-muted hover:text-text'}`}
                >
                  {lng}
                </button>
              ))}
            </div>
            <button onClick={toggleTheme} className="ml-3 text-text-muted hover:text-accent transition-colors" aria-label={locale === 'nl' ? 'Thema wisselen' : locale === 'en' ? 'Toggle theme' : 'Changer de thème'}>
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <Suspense fallback={<div className="w-16 h-5" />}>
              <UserButton />
            </Suspense>
          </div>

          <button
            ref={toggleRef}
            className="md:hidden ml-auto flex flex-col justify-center gap-1.5 w-8 h-8"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className={`block h-px w-6 bg-text transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} />
            <span className={`block h-px w-6 bg-text transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          ref={menuRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-40 bg-bg/98 flex flex-col items-center justify-center gap-8 md:hidden"
        >
          {navLinks.map(link => (
            <a key={link.key} href={resolveHref(link)} onClick={() => setMenuOpen(false)} className="text-2xl font-display italic text-text hover:text-accent transition-colors" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {(dict.nav as Record<string, string>)[link.key]}
            </a>
          ))}
          <div className="flex items-center gap-3 mt-4">
            {langs.map(lng => (
              <button
                key={lng}
                onClick={() => { setLocale(lng); setMenuOpen(false); }}
                className={`text-sm uppercase tracking-wider px-3 py-1 border ${locale === lng ? 'border-accent text-accent' : 'border-border text-text-muted'}`}
              >
                {lng}
              </button>
            ))}
          </div>
          <div className="mt-4"><Suspense fallback={<div className="w-16 h-5" />}><UserButton /></Suspense></div>
        </div>
      )}
    </>
  );
}
