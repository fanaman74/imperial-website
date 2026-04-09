type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
};

type FeaturedDishesProps = {
  dict: { title: string };
  dishes: Dish[];
};

const cardGradients = [
  'from-[#3a1010] to-[#1a0808]',
  'from-[#1a1208] to-[#0e0c06]',
  'from-[#0e1a18] to-[#080f0e]',
  'from-[#1a100e] to-[#100808]',
];

export default function FeaturedDishes({ dict, dishes }: FeaturedDishesProps) {
  return (
    <section id="featured" className="py-24 px-6 bg-bg-alt">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="font-chango text-3xl md:text-4xl text-center mb-12">
          {dict.title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {dishes.map((item, idx) => (
            <div
              key={item.id}
              className="relative rounded-sm overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
            >
              {item.image ? (
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                </div>
              ) : (
                <div className={`aspect-[3/4] bg-gradient-to-br ${cardGradients[idx % cardGradients.length]} relative`}>
                  {/* Decorative pattern */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
                  }} />
                  {/* Accent line */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-accent/40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
              )}

              {/* Text overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="font-display text-lg italic mb-1 text-white drop-shadow-lg leading-tight">{item.name}</h3>
                {item.description && (
                  <p className="text-white/70 text-xs mb-3 drop-shadow-md line-clamp-2 leading-relaxed">{item.description}</p>
                )}
                <span className="inline-block bg-accent/90 text-white text-sm font-semibold px-3 py-1">
                  {item.price.toFixed(2)}&euro;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
