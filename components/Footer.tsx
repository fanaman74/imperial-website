type FooterDict = {
  nav: {
    home: string;
    menu: string;
    events: string;
    info: string;
    contact: string;
  };
  findUs: {
    address: string;
    phone: string;
  };
  footer: {
    copyright: string;
  };
};

const navLinks = [
  { key: 'home' as const, href: '#accueil' },
  { key: 'menu' as const, href: '#menu' },
  { key: 'events' as const, href: '#evenements' },
  { key: 'info' as const, href: '#informations' },
  { key: 'contact' as const, href: '#contact' },
];

export default function Footer({ dict }: { dict: FooterDict }) {
  return (
    <footer className="border-t border-border py-16 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-8 text-center">
        {/* Wordmark */}
        <a href="#accueil" className="font-display uppercase tracking-[0.2em] text-2xl text-text no-underline">
          IMPERIAL
        </a>

        {/* Nav links */}
        <nav className="flex flex-wrap justify-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="text-sm text-text-muted hover:text-accent transition-colors uppercase tracking-wider"
            >
              {dict.nav[link.key]}
            </a>
          ))}
        </nav>

        {/* Address + phone */}
        <div className="text-text-muted text-sm space-y-1">
          <p>{dict.findUs.address}</p>
          <a href={`tel:${dict.findUs.phone.replace(/\s/g, '')}`} className="hover:text-accent transition-colors">
            {dict.findUs.phone}
          </a>
        </div>

        {/* Social icons */}
        <div className="flex items-center gap-4">
          {/* Facebook */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-accent transition-colors"
            aria-label="Facebook"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>

        {/* Copyright */}
        <p className="text-text-muted text-xs">
          {dict.footer.copyright}
        </p>
      </div>
    </footer>
  );
}
