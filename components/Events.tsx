type EventsDict = {
  title: string;
  body: string;
  cta: string;
};

export default function Events({ dict }: { dict: EventsDict }) {
  return (
    <section
      id="evenements"
      className="relative py-32 px-6 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          'url(https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=1920)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-bg/85" />

      <div className="relative z-10 max-w-[600px] mx-auto text-center">
        <h2 className="font-chango text-3xl md:text-4xl mb-6">
          {dict.title}
        </h2>
        <p className="text-text-muted leading-relaxed mb-8">
          {dict.body}
        </p>
        <a
          href="/event-contact"
          className="inline-block border border-accent text-accent px-8 py-3 text-sm uppercase tracking-wider hover:bg-accent hover:text-bg transition-colors"
        >
          {dict.cta}
        </a>
      </div>
    </section>
  );
}
