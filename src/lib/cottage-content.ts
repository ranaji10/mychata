// Exact approved bilingual content from docs/content; UI suggestions only, never auto-saved.
export const FIELD_HINTS = {
  address: [
    "Uvidí ji jen členové chaty. Hosté jen tehdy, když ji správce sdílí v odkazu pro hosty. Veřejně se nezobrazuje.",
    "Only the cottage's members see it. Guests see it only if an admin shares it in a guest link. It is never shown publicly.",
  ],
  rooms: [
    "Pomáhá členům naplánovat, kolik lidí se vejde. Vidí ho jen členové chaty.",
    "Helps members plan how many people fit. Only the cottage's members see it.",
  ],
  capacity: [
    "Aplikace podle ní upozorní, když by v jednu noc bylo hostů víc, než se vejde. Vidí ji členové; hosté jen v odkazu, který správce sdílí.",
    "The app uses it to warn when one night would have more guests than fit. Members see it; guests only in a link an admin shares.",
  ],
  seasons: [
    "Podle nich aplikace nabídne úkoly na otevření a zazimování chaty. Vidí je jen členové.",
    "The app uses them to suggest opening and winterising tasks. Only members see them.",
  ],
  photo: [
    "Ukazují chatu na stránce Domů. Vidí je členové; hosté jen tehdy, když je správce sdílí.",
    "Show the cottage on Home. Members see them; guests only if an admin shares them.",
  ],
  phone: [
    "Aby se vám ostatní členové mohli ozvat, když je potřeba. Vidí ho jen členové chaty.",
    "So other members can reach you when needed. Only the cottage's members see it.",
  ],
} as const;
export const STARTER_RULES = [
  [
    "Před odjezdem chatu ukliďte tak, jak byste ji chtěli najít.",
    "Before you leave, clean the cottage the way you would like to find it.",
  ],
  [
    "Při odchodu zavřete vodu, zhasněte a vypněte spotřebiče, které nemusí běžet.",
    "When you leave, turn off the water, the lights and any appliance that doesn't need to stay on.",
  ],
  [
    "Dřevo, které spálíte, doplňte nebo dejte vědět, že dochází.",
    "Replace the firewood you burn, or let the others know it is running low.",
  ],
  [
    "Odpadky odvezte s sebou a třiďte podle nálepek u popelnic.",
    "Take your rubbish with you and sort it as the labels on the bins say.",
  ],
  [
    "Klíče vracejte vždy na stejné místo a nikomu je nepůjčujte bez domluvy.",
    "Always put the keys back in the same place, and don't lend them to anyone without asking.",
  ],
  [
    "Domácí zvířata jen po domluvě; do ložnic nesmí.",
    "Pets only by arrangement, and never in the bedrooms.",
  ],
  [
    "Od 22 do 7 hodin dodržujte noční klid, i kvůli sousedům.",
    "Keep quiet from 10 pm to 7 am, for the neighbours too.",
  ],
  [
    "V zimě nechte topení na temperování a nikdy úplně nevypínejte.",
    "In winter, leave the heating on the frost setting and never switch it off completely.",
  ],
  [
    "Na zimu vypusťte vodu podle návodu v manuálu.",
    "Before winter, drain the water as the manual describes.",
  ],
  [
    "Otevřené jídlo a nic, co se zkazí, v chatě nenechávejte.",
    "Don't leave opened food or anything perishable in the cottage.",
  ],
] as const;
export const MANUAL_QUESTIONS = [
  {
    title: ["Příjezd a klíče", "Arrival and keys"],
    category: "arrival",
    questions: [
      {
        title: ["Kde jsou klíče?", "Where are the keys?"],
        answers: [
          ["V schránce s kódem u dveří", "In a code box by the door"],
          ["U souseda", "With a neighbour"],
          ["Každý má svůj klíč", "Everyone has their own key"],
        ],
      },
      {
        title: ["Jak se odemyká branka nebo závora?", "How do you open the gate or barrier?"],
        answers: [
          ["Stejným klíčem", "With the same key"],
          ["Kód na zámku", "A code on the lock"],
          ["Je volně otevřená", "It is always open"],
        ],
      },
      {
        title: ["Kde se parkuje?", "Where do you park?"],
        answers: [
          ["Na pozemku", "On the property"],
          ["U cesty před chatou", "On the lane in front"],
          ["Na obecním parkovišti", "In the village car park"],
        ],
      },
      {
        title: ["Co udělat hned po příjezdu?", "What to do right after arriving?"],
        answers: [
          ["Pustit vodu", "Turn the water on"],
          ["Zapnout jistič", "Switch the main breaker on"],
          ["Otevřít okenice", "Open the shutters"],
        ],
      },
    ],
  },
  {
    title: ["Voda", "Water"],
    category: "water",
    questions: [
      {
        title: ["Kde je hlavní uzávěr vody?", "Where is the main water valve?"],
        answers: [
          ["Ve sklepě", "In the cellar"],
          ["Pod dřezem", "Under the sink"],
          ["V šachtě na zahradě", "In a shaft in the garden"],
        ],
      },
      {
        title: ["Odkud je voda?", "Where does the water come from?"],
        answers: [
          ["Obecní vodovod", "Mains supply"],
          ["Vlastní studna", "Own well"],
          ["Dovážená voda", "Delivered water"],
        ],
      },
      {
        title: ["Je voda pitná?", "Is the water drinkable?"],
        answers: [
          ["Ano", "Yes"],
          ["Jen převařená", "Only boiled"],
          ["Ne, pitnou vodu přivezte", "No, bring drinking water"],
        ],
      },
      {
        title: ["Jak se ohřívá teplá voda?", "How is hot water heated?"],
        answers: [
          ["Bojler, zapíná se vypínačem", "Boiler, switched on at the wall"],
          ["Plynový kotel", "Gas boiler"],
          ["Teplá voda není", "There is no hot water"],
        ],
      },
    ],
  },
  {
    title: ["Elektřina a topení", "Electricity and heating"],
    category: "heating",
    questions: [
      {
        title: ["Kde je hlavní jistič?", "Where is the main breaker?"],
        answers: [
          ["V předsíni", "In the hallway"],
          ["Ve sklepě", "In the cellar"],
          ["Venku na sloupku", "Outside on a post"],
        ],
      },
      {
        title: ["Čím se topí?", "How is the cottage heated?"],
        answers: [
          ["Kamna na dřevo", "Wood stove"],
          ["Elektrické přímotopy", "Electric heaters"],
          ["Kotel (plyn nebo pelety)", "Boiler (gas or pellets)"],
        ],
      },
      {
        title: ["Kde je dřevo a podpal?", "Where are the firewood and kindling?"],
        answers: [
          ["V kůlně", "In the shed"],
          ["Pod přístřeškem u chaty", "Under the lean-to by the cottage"],
          ["Ve sklepě", "In the cellar"],
        ],
      },
      {
        title: [
          "Jak dlouho trvá vytopit chatu v zimě?",
          "How long does it take to warm the cottage in winter?",
        ],
        answers: [
          ["Do hodiny", "Under an hour"],
          ["2–3 hodiny", "2–3 hours"],
          ["Půl dne", "Half a day"],
        ],
      },
    ],
  },
  {
    title: ["Wi-Fi", "Wi-Fi"],
    category: "wifi",
    questions: [
      {
        title: ["Je v chatě Wi-Fi?", "Is there Wi-Fi?"],
        answers: [
          ["Ano", "Yes"],
          ["Ne, jen mobilní signál", "No, mobile signal only"],
          ["Ne a signál je slabý", "No, and the signal is weak"],
        ],
      },
      {
        title: ["Kde je název sítě a heslo?", "Where are the network name and password?"],
        answers: [
          ["Na routeru", "On the router"],
          ["Tady v manuálu (jen pro členy)", "Here in the manual (members only)"],
          ["Zeptejte se správce", "Ask the admin"],
        ],
      },
      {
        title: [
          "Kde je router a jak ho restartovat?",
          "Where is the router and how do you restart it?",
        ],
        answers: [
          [
            "V obýváku, vytáhnout ze zásuvky na 10 vteřin",
            "In the living room, unplug for 10 seconds",
          ],
          ["V předsíni", "In the hallway"],
          ["Na půdě", "In the attic"],
        ],
      },
    ],
  },
  {
    title: ["Odpad", "Waste"],
    category: "waste",
    questions: [
      {
        title: ["Kam s odpadky?", "Where does the rubbish go?"],
        answers: [
          ["Popelnice u chaty", "Bins by the cottage"],
          ["Kontejnery v obci", "Containers in the village"],
          ["Odvézt s sebou", "Take it home"],
        ],
      },
      {
        title: ["Kdy se vyváží popelnice?", "When are the bins emptied?"],
        answers: [
          ["Každý týden", "Every week"],
          ["Každých 14 dní", "Every two weeks"],
          ["Jen v sezóně", "Only in season"],
        ],
      },
      {
        title: ["Je tu kompost?", "Is there a compost heap?"],
        answers: [
          ["Ano, za kůlnou", "Yes, behind the shed"],
          ["Ne", "No"],
        ],
      },
    ],
  },
  {
    title: ["Odjezd z chaty", "Leaving the cottage"],
    category: "departure",
    questions: [
      {
        title: ["Co zavřít a vypnout?", "What to turn off and close?"],
        answers: [
          ["Vodu", "The water"],
          ["Jistič (kromě lednice)", "The breaker (except the fridge)"],
          ["Okenice a okna", "Shutters and windows"],
        ],
      },
      {
        title: ["Co s lednicí?", "What about the fridge?"],
        answers: [
          ["Nechat zapnutou", "Leave it on"],
          ["Vypnout, vyprázdnit a nechat otevřenou", "Switch off, empty and leave open"],
        ],
      },
      {
        title: ["Kam s prádlem a ručníky?", "What to do with bedding and towels?"],
        answers: [
          ["Odvézt vyprat", "Take them home to wash"],
          ["Do koše v koupelně", "In the basket in the bathroom"],
          ["Nechat na posteli", "Leave them on the bed"],
        ],
      },
      {
        title: ["Kam vrátit klíče?", "Where do the keys go back?"],
        answers: [
          ["Do schránky s kódem", "Into the code box"],
          ["Sousedovi", "To the neighbour"],
          ["Vzít s sebou", "Take them with you"],
        ],
      },
    ],
  },
  {
    title: ["Nouzové situace", "Emergencies"],
    category: "emergency",
    questions: [
      {
        title: ["Kde je lékárnička?", "Where is the first-aid kit?"],
        answers: [
          ["V kuchyni", "In the kitchen"],
          ["V koupelně", "In the bathroom"],
          ["Žádná tu není, přivezte vlastní", "There is none, bring your own"],
        ],
      },
      {
        title: ["Kde je hasicí přístroj?", "Where is the fire extinguisher?"],
        answers: [
          ["U kamen", "By the stove"],
          ["V kuchyni", "In the kitchen"],
          ["V předsíni", "In the hallway"],
        ],
      },
      {
        title: [
          "Koho volat při havárii (voda, elektřina)?",
          "Whom to call in an emergency (water, electricity)?",
        ],
        answers: [
          ["Správce chaty", "The cottage admin"],
          ["Souseda", "The neighbour"],
          ["Tísňová linka 112", "Emergency number 112"],
        ],
      },
      {
        title: ["Kde je nejbližší lékař nebo lékárna?", "Where is the nearest doctor or pharmacy?"],
        answers: [
          ["V obci", "In the village"],
          ["Ve městě do 15 minut autem", "In town, within 15 minutes by car"],
          ["Dál než 30 minut", "More than 30 minutes away"],
        ],
      },
    ],
  },
  {
    title: ["Sousedé", "Neighbours"],
    category: "neighbours",
    questions: [
      {
        title: [
          "Kdo je nejbližší soused a dá se na něj obrátit?",
          "Who is the nearest neighbour, and can you ask them for help?",
        ],
        answers: [
          ["Ano, má náš klíč", "Yes, they have our key"],
          ["Ano, ale klíč nemá", "Yes, but they don't have a key"],
          ["Raději ne", "Better not"],
        ],
      },
      {
        title: ["Na co jsou sousedé citliví?", "What are the neighbours sensitive about?"],
        answers: [
          ["Hluk večer", "Noise in the evening"],
          ["Parkování u cesty", "Parking on the lane"],
          ["Pálení na zahradě", "Bonfires in the garden"],
        ],
      },
      {
        title: [
          "Jsou nějaké společné věci (cesta, studna, plot)?",
          "Is anything shared (lane, well, fence)?",
        ],
        answers: [
          ["Společná cesta", "A shared lane"],
          ["Společná studna", "A shared well"],
          ["Nic", "Nothing"],
        ],
      },
    ],
  },
] as const;

/**
 * House rules as typed in the editor, cleaned (no blank or space-only lines) and in both
 * languages: a starter rule left as it was gets its exact translation, anything the family
 * wrote stays as written in both (T-057; was done only on Manage cottages).
 */
export function bilingualRules(text: string): { cs: string; en: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const pick = (language: 0 | 1) =>
    lines
      .map(
        (line) =>
          STARTER_RULES.find((rule) => rule[0] === line || rule[1] === line)?.[language] ?? line,
      )
      .join("\n");
  return { cs: pick(0), en: pick(1) };
}
