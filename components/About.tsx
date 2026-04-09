type AboutDict = {
  title: string;
  body: string;
};

export default function About({ dict }: { dict: AboutDict }) {
  return (
    <section id="about" className="py-24 px-6">
      <div className="max-w-[700px] mx-auto text-center">
        <h2 className="font-chango text-3xl md:text-4xl mb-6">
          {dict.title}
        </h2>
        <p className="text-text-muted leading-relaxed">
          {dict.body}
        </p>
      </div>
    </section>
  );
}
