type HeroDict = {
  superscript: string;
  title: string;
  subtitle: string;
  cta: string;
  scroll: string;
};

export default function Hero({ dict }: { dict: HeroDict }) {
  return (
    <section id="accueil" className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="https://assets.mixkit.co/videos/9286/9286-thumb-360-0.jpg"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="https://assets.mixkit.co/videos/9286/9286-720.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 flex flex-col items-center gap-5">
        <span className="text-xs uppercase tracking-[0.3em] text-accent-alt hero-animate hero-animate-delay-1 drop-shadow-lg">
          {dict.superscript}
        </span>

        <h1 className="font-chango text-4xl md:text-5xl lg:text-6xl max-w-[700px] hero-animate hero-animate-delay-2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {dict.title}
        </h1>

        <p className="text-white/80 max-w-[500px] hero-animate hero-animate-delay-3 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          {dict.subtitle}
        </p>

        <a
          href="#menu"
          className="inline-block mt-4 bg-accent text-bg px-10 py-4 text-sm uppercase tracking-wider hover:text-white transition-colors hero-animate hero-animate-delay-4"
        >
          {dict.cta}
        </a>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-text-muted">
        <span className="text-xs uppercase tracking-wider">{dict.scroll}</span>
        <svg
          className="w-4 h-4 animate-bounce"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
