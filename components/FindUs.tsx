type HoursEntry = {
  day: string;
  time: string;
};

type FindUsDict = {
  title: string;
  address: string;
  phone: string;
  hoursTitle: string;
  hours: {
    monday: HoursEntry;
    tuesday: HoursEntry;
    wednesday: HoursEntry;
    thursday: HoursEntry;
    friday: HoursEntry;
    saturday: HoursEntry;
    sunday: HoursEntry;
  };
};

const hourKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const closedWords = ['Fermé', 'Gesloten', 'Closed'];

export default function FindUs({ dict }: { dict: FindUsDict }) {
  return (
    <section id="informations" className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="font-chango text-3xl md:text-4xl mb-12 text-center">
          {dict.title}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Info */}
          <div className="text-center lg:text-left">
            <p className="text-text-muted mb-2">{dict.address}</p>
            <a
              href={`tel:${dict.phone.replace(/\s/g, '')}`}
              className="text-accent hover:underline"
            >
              {dict.phone}
            </a>

            <h3 className="font-display text-xl mt-8 mb-4">{dict.hoursTitle}</h3>
            <table className="w-full text-sm mx-auto max-w-md lg:mx-0 lg:max-w-none">
              <tbody>
                {hourKeys.map((key) => {
                  const entry = dict.hours[key];
                  const isClosed = closedWords.includes(entry.time);
                  return (
                    <tr key={key} className="border-b border-border">
                      <td className="py-2 pr-4">{entry.day}</td>
                      <td className={`py-2 ${isClosed ? 'text-text-muted' : ''}`}>
                        {entry.time}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right: Map */}
          <div className="rounded-lg overflow-hidden min-h-[400px]">
            <iframe
              title="Restaurant Imperial location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2516.8!2d4.4185!3d50.9278!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c3c39fe7c77e0f%3A0x1!2sRomeinsesteenweg%20220%2C%201800%20Vilvoorde!5e0!3m2!1sfr!2sbe!4v1"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '400px' }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
