'use client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type Course = {
  num: string;
  items: string[];
  choice?: boolean;
};

type FixedMenu = {
  name: string;
  price: string;
  note?: string;
  courses: Course[];
};

const menus: Record<string, FixedMenu[]> = {
  fr: [
    {
      name: 'Menu Lunch',
      price: '18',
      note: 'Lun–Ven 12h–14h30',
      courses: [
        {
          num: '①',
          items: ['Soupe nid d\'oiseau', 'Soupe piquante', 'Mini nems', 'Triangles au curry'],
          choice: true,
        },
        {
          num: '②',
          items: ['Poulet sauce curry', 'Filet de poulet sauce aigre-douce', 'Bœuf sauce piquante', 'Chop suey bœuf', 'Nouilles poulet', 'Riz au porc'],
          choice: true,
        },
        { num: '③', items: ['Thé ou café'] },
      ],
    },
    {
      name: 'Menu',
      price: '26',
      note: 'Tous les jours',
      courses: [
        {
          num: '①',
          items: ['Soupe nid d\'oiseau', 'Soupe piquante'],
          choice: true,
        },
        { num: '②', items: ['Rouleaux de printemps'] },
        {
          num: '③',
          items: ['Poulet sauce curry', 'Bœuf sauce piquante', 'Babi Pangang'],
          choice: true,
        },
        { num: '④', items: ['Café ou thé'] },
      ],
    },
    {
      name: 'Menu Découverte',
      price: '35',
      note: 'min. 2 pers.',
      courses: [
        { num: '①', items: ['Soupe Wan-Tan'] },
        { num: '②', items: ['Nems'] },
        {
          num: '③',
          items: ['Canard à l\'orange', 'Scampis aux légumes', 'Ti-Pan bœuf'],
          choice: true,
        },
        { num: '④', items: ['Café ou thé'] },
      ],
    },
    {
      name: 'Hotpot',
      price: '36',
      note: 'min. 2 pers.',
      courses: [
        { num: '①', items: ['Dim Sum vapeur'] },
        {
          num: '②',
          items: ['Scampis', 'Calmar', 'Filet de poulet', 'Filet de bœuf', 'Légumes', 'Vermicelle', 'Noix de Saint-Jacques', 'Pâté de poisson'],
          choice: false,
        },
      ],
    },
  ],
  nl: [
    {
      name: 'Lunchmenu',
      price: '18',
      note: 'Ma–Vr 12h–14h30',
      courses: [
        {
          num: '①',
          items: ['Vogelnestjessoep', 'Pikante soep', 'Mini-loempia', 'Kerrie-hoekjes'],
          choice: true,
        },
        {
          num: '②',
          items: ['Kip kerriesaus', 'Kipfilet zoetzure saus', 'Rund pikante saus', 'Chop suey rund', 'Noedels kip', 'Rijst varkensvlees'],
          choice: true,
        },
        { num: '③', items: ['Thee of koffie'] },
      ],
    },
    {
      name: 'Menu',
      price: '26',
      note: 'Elke dag',
      courses: [
        {
          num: '①',
          items: ['Vogelnestjessoep', 'Pikante soep'],
          choice: true,
        },
        { num: '②', items: ['Lenterolletjes'] },
        {
          num: '③',
          items: ['Kip kerriesaus', 'Rund pikante saus', 'Babi Pangang'],
          choice: true,
        },
        { num: '④', items: ['Koffie of thee'] },
      ],
    },
    {
      name: 'Ontdekkingsmenu',
      price: '35',
      note: 'min. 2 pers.',
      courses: [
        { num: '①', items: ['Wan-Tan soep'] },
        { num: '②', items: ['Nems'] },
        {
          num: '③',
          items: ['Eend sinaasappel', 'Scampis met groenten', 'Ti-Pan rund'],
          choice: true,
        },
        { num: '④', items: ['Koffie of thee'] },
      ],
    },
    {
      name: 'Hotpot',
      price: '36',
      note: 'min. 2 pers.',
      courses: [
        { num: '①', items: ['Gestoomde dim sum'] },
        {
          num: '②',
          items: ['Scampis', 'Inktvis', 'Kipfilet', 'Rundsfilet', 'Groenten', 'Vermicelli', 'St.-Jacobsvruchten', 'Vispaté'],
          choice: false,
        },
      ],
    },
  ],
  en: [
    {
      name: 'Lunch Menu',
      price: '18',
      note: 'Mon–Fri 12:00–14:30',
      courses: [
        {
          num: '①',
          items: ['Bird\'s nest soup', 'Spicy soup', 'Mini spring rolls', 'Curry triangles'],
          choice: true,
        },
        {
          num: '②',
          items: ['Chicken curry sauce', 'Chicken fillet sweet & sour', 'Beef spicy sauce', 'Chop suey beef', 'Noodles chicken', 'Rice with pork'],
          choice: true,
        },
        { num: '③', items: ['Tea or coffee'] },
      ],
    },
    {
      name: 'Menu',
      price: '26',
      note: 'Every day',
      courses: [
        {
          num: '①',
          items: ['Bird\'s nest soup', 'Spicy soup'],
          choice: true,
        },
        { num: '②', items: ['Spring rolls'] },
        {
          num: '③',
          items: ['Chicken curry sauce', 'Beef spicy sauce', 'Babi Pangang'],
          choice: true,
        },
        { num: '④', items: ['Coffee or tea'] },
      ],
    },
    {
      name: 'Discovery Menu',
      price: '35',
      note: 'min. 2 pers.',
      courses: [
        { num: '①', items: ['Wan-Tan soup'] },
        { num: '②', items: ['Spring rolls'] },
        {
          num: '③',
          items: ['Duck with orange', 'Scampi with vegetables', 'Ti-Pan beef'],
          choice: true,
        },
        { num: '④', items: ['Coffee or tea'] },
      ],
    },
    {
      name: 'Hotpot',
      price: '36',
      note: 'min. 2 pers.',
      courses: [
        { num: '①', items: ['Steamed dim sum'] },
        {
          num: '②',
          items: ['Scampi', 'Squid', 'Chicken fillet', 'Beef fillet', 'Vegetables', 'Vermicelli', 'Scallops', 'Fish pâté'],
          choice: false,
        },
      ],
    },
  ],
};

const titles: Record<string, string> = {
  fr: 'Menus Fixes',
  nl: 'Vaste Menu\'s',
  en: 'Set Menus',
};

const choiceLabels: Record<string, string> = {
  fr: 'Au choix',
  nl: 'Keuze',
  en: 'Choice',
};

const hotpotIncludes: Record<string, string> = {
  fr: '8 variétés',
  nl: '8 soorten',
  en: '8 varieties',
};

export default function FixedMenus() {
  const { locale } = useLanguage();
  const lang = (locale as string) in menus ? (locale as string) : 'fr';
  const menuList = menus[lang];
  const title = titles[lang];
  const choiceLabel = choiceLabels[lang];

  return (
    <section className="py-24 px-6 bg-bg-alt/30">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="font-chango text-3xl md:text-4xl text-center mb-12">
          {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuList.map((menu, idx) => (
            <div
              key={idx}
              className="border border-border bg-bg rounded-sm p-6 flex flex-col gap-4 relative overflow-hidden"
            >
              {/* Price badge */}
              <div className="absolute top-0 right-0 bg-accent text-bg px-4 py-2 text-lg font-display font-semibold">
                {menu.price}€
              </div>

              {/* Header */}
              <div>
                <h3 className="font-display italic text-xl text-accent pr-16">{menu.name}</h3>
                {menu.note && (
                  <p className="text-xs uppercase tracking-wider text-text-muted mt-1">{menu.note}</p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Courses */}
              <div className="space-y-3">
                {menu.courses.map((course, ci) => (
                  <div key={ci} className="flex gap-3">
                    <span className="text-accent-alt text-base shrink-0 w-6 text-center leading-5 mt-0.5">{course.num}</span>
                    <div className="flex-1 min-w-0">
                      {course.items.length === 1 ? (
                        <span className="text-sm text-text leading-relaxed">{course.items[0]}</span>
                      ) : (
                        <>
                          {course.choice && (
                            <p className="text-xs uppercase tracking-wider text-text-muted mb-1.5">{choiceLabel}</p>
                          )}
                          {idx === 3 && ci === 1 ? (
                            // Hotpot: show as comma-separated inline
                            <p className="text-sm text-text-muted leading-relaxed">
                              {course.items.join(' · ')}
                            </p>
                          ) : (
                            <ul className="space-y-0.5">
                              {course.items.map((item, ii) => (
                                <li key={ii} className="text-sm text-text flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-accent-alt shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
