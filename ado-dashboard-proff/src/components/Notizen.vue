<script setup lang="ts">
import { ref, onMounted } from 'vue';

/**
 * Configuration & Interfaces
 */
interface Quote {
  text: string;
  condition?: () => boolean;
  resolveDynamic?: (text: string) => string;
}

const displayQuote = ref<string>('');
const isVisible = ref(false);

/**
 * Logic Helpers
 */

// Helper: Check if it is currently a weekday before 8:00 AM
const isEarlyWeekday = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sun, 6 = Sat
  // Weekday (1-5) AND before 8 AM
  return day >= 1 && day <= 5 && hour > 4 && hour < 8;
};

// Helper: Check if date is between Dec 1 and Dec 26
const isChristmasTime = (): boolean => {
  const now = new Date();
  const month = now.getMonth(); // 11 = December
  const date = now.getDate();
  return month === 11 && date >= 1 && date <= 26;
};

// Helper: Calculate days to next Berlin School Holiday
// Returns number of days, or null if currently indeterminate
const getDaysToBerlinBreak = (): number | null => {
  const now = new Date();
  // Valid Berlin Holiday Starts (2025-2027) - Update this list as needed
  const holidays = [
    new Date('2026-01-31'), // Winterferien 2026
    new Date('2026-03-28'), // Osterferien
    new Date('2026-07-09'), // Sommerferien
    new Date('2026-10-17'), // Herbstferien
    new Date('2026-12-23'), // Weihnachtsferien
    new Date('2026-01-29'), // Winterferien 2027
    new Date('2026-03-20'), // Osterferien
    new Date('2026-07-01'), // Sommerferien
  ];

  // Find the first holiday that is in the future
  const nextHoliday = holidays.find((h) => h.getTime() > now.getTime());

  if (!nextHoliday) return null;

  const diffTime = Math.abs(nextHoliday.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * The Data Set
 */
const quotes: Quote[] = [
  { text: 'I miss the old Kanye' },
  {
    text: 'Kopf hoch. Nur noch {x} Tage bis zu den Ferien',
    // Only show if we can calculate a valid date
    condition: () => getDaysToBerlinBreak() !== null,
    // Replace placeholder with calculation
    resolveDynamic: (t) => {
      const days = getDaysToBerlinBreak();
      return t.replace('{x}', days ? days.toString() : '?');
    }
  },
  { text: 'Einfach. Besser. Organisiert. Dashboard!' },
  { text: 'Papier ist von gestern. Mach es digital!' },
  { text: '#EatTheRich' },
  { text: 'Auch schlechte Tage haben nur 24 Stunden' },
  { text: 'Ist Wasser nass?' },
  {
    text: 'Ich muss jetzt aufstehen, aber noch eine Minute mehr…',
    condition: isEarlyWeekday
  },
  { text: 'Schneller als deutsche Bürokratie (immerhin)' },
  { text: 'Das Schweizer Taschenmesser für die Schule' },
  { text: 'Wake Up Mr. West!' },
  { text: 'listen to the kids' },
  { text: 'und dann?' },
  { text: 'Wer ist der King of Rap?' },
  { text: 'Ich bin ein Berliner!' },
  { text: 'Niemand hat die Absicht eine Mauer zu errichten.' },
  { text: 'I have a dream' },
  { text: 'Weil Menschen Fehler machen.' },
  { text: 'Lade dein Chaos in die Cloud hoch!' },
  { text: 'Verbring mehr Zeit mit deiner Familie – Schul Dashboard' },
  { text: 'Nie ohne Seife waschen' },
  { text: 'Jetzt im Kino!' },
  {
    text: 'Ho ho ho!',
    condition: isChristmasTime
  },
  { text: 'Ohne Fruchtfleisch!' },
  { text: 'Pasteurisiert und homogenisiert!' },
  { text: 'Ohne Zusatzstoffe!' },
  { text: '0 Kalorien – Schul Dashboard' },
  { text: 'AppLogoutButton unsere Milch kommt von organischen Kühen!' },
  { text: '100% Tierleidfrei!' },
  { text: 'Diese Website enthält kein echtes Tierfleisch.' },
  { text: 'Fettarm und lang haltbar!' },
  { text: 'Zertifiziert freiwillige Kinderarbeit – Schul Dashboard' },
  { text: '100 Tage Geld-zurück-Garantie!' },
  { text: 'Wenn das Leben dir Zitronen gibt, spritz den Saft in die Augen deiner Gegner.'},
  { text: '100% Fairtrade Codezeilen aus zertifiziertem Anbau!'},
  { text: 'gleich /gleích/, Adverb: unbestimmer Zeitpunkt in der Zukunft, wahrscheinlich aber nie'},
  { text: 'Wenn ich 5 Minuten vor der Abgabe anfange, brauche ich nur 5 Minuten.'},
  { text: '42'},
  { text: 'When the Revolution Comes...'},
  { text: 'I can see dead people'},
  { text: 'Who will survive in America?'},
  { text: 'Alles, was man verbietet, macht man interessant.'},
  { text: 'Der Kuchen ist eine Lüge.'},
  { text: 'Hast du es schon aus- und wieder eingeschaltet?'},
  { text: 'Kann Spuren von Nüssen enthalten.'},
  { text: 'Renn, Forrest, renn!'},
  { text: 'Wir schaffen das!'},
  { text: 'Das Internet ist für uns alle Neuland.'},
  { text: 'Schmeckt besser, als es aussieht.'},
  { text: 'Fragt nicht, was euer Land für euch tun kann – geht in den Krieg und sterbt.'},
  { text: 'Ich lerne, also bin ich.'},
  { text: 'Alle wollen die Welt verändern, aber keiner sich selbst.'},
  { text: 'Dashboard benutzen oder Dashboard nicht benutzen, das ist hier die Frage.'},
  { text: "I'm going to make him an offer he can't refuse"},
  { text: 'Ein kleiner Schritt für die Menschheit, ein großer für einen Schüler – Dashboard'},
  { text: 'ähm... sozusagen'},
  { text: "Can't tell me nothing"},
  { text: "This is family business and this is for the family that can't be with us"},
  { text: 'Little was known of Sierra Leone and how it connects to the diamonds we own'},
  { text: "What's going on"},
  { text: 'I never sleep, cause sleep is the cousin of death'},
  { text: 'Keep Ya Head Up'},
  { text: 'Just remember ALL CAPS when you spell the man name'},
];

/**
 * Execution
 */
onMounted(() => {
  // 1. Filter quotes based on conditions
  const availableQuotes = quotes.filter(q => q.condition ? q.condition() : true);

  // 2. Pick random index
  if (availableQuotes.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableQuotes.length);
    const selected = availableQuotes[randomIndex];

    // 3. Resolve text (handle dynamic numbers if needed)
    let finalString = selected.text;
    if (selected.resolveDynamic) {
      finalString = selected.resolveDynamic(finalString);
    }

    displayQuote.value = finalString;

    // Trigger animation
    setTimeout(() => {
      isVisible.value = true;
    }, 100);
  }
});
</script>

<template>
  <h2
      class="tagline-text"
      :class="{ 'visible': isVisible }"
  >
    {{ displayQuote }}
  </h2>
</template>

<style scoped>

.tagline-text {
  color: var(--sub);
  font-size: var(--font-size-body);
  font-family: var(--normal-font), sans-serif;
  font-style: italic;
  font-weight: 500;
}
</style>