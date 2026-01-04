<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

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
  return day >= 1 && day <= 5 && hour < 8;
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
    new Date('2025-01-27'), // Winterferien 2025 start
    new Date('2025-04-14'), // Osterferien
    new Date('2025-07-24'), // Sommerferien
    new Date('2025-10-20'), // Herbstferien
    new Date('2025-12-22'), // Weihnachtsferien
    new Date('2026-02-02'), // Winterferien 2026
    new Date('2026-03-30'), // Osterferien
    new Date('2026-07-09'), // Sommerferien
    new Date('2026-10-19'), // Herbstferien
    new Date('2026-12-23'), // Weihnachtsferien
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
  { text: 'Das Schweizer Taschenmesser für die Schule.' },
  { text: 'Wake Up Mr. West!' },
  { text: 'listen to the kids' },
  { text: 'und dann?' },
  { text: 'Wer ist der King of Rap?' },
  { text: 'Ich bin ein Berliner!' },
  { text: 'Niemand hat die Absicht eine Mauer zu errichten.' },
  { text: 'I have a dream.' },
  { text: 'Weil Menschen Fehler machen.' },
  { text: 'Lade dein Chaos in die Cloud hoch!' },
  { text: 'Verbring mehr Zeit mit deiner Familie – Schul Dashboard' },
  { text: 'Nie ohne Seife waschen.' },
  { text: 'Jetzt im Kino!' },
  {
    text: 'Ho ho ho!',
    condition: isChristmasTime
  },
  { text: 'Ohne Fruchtfleisch!' },
  { text: 'Pasteurisiert und homogenisiert!' },
  { text: 'Ohne Zusatzstoffe!' },
  { text: '0 Kalorien – Schul Dashboard' },
  { text: 'All unsere Milch kommt von organischen Kühen!' },
  { text: '100% Tierleidfrei!' },
  { text: 'Diese Website enthält kein echtes Tierfleisch.' },
  { text: 'Fettarm und lang haltbar!' },
  { text: 'Zertifiziert freiwillige Kinderarbeit – Schul Dashboard' },
  { text: '100 Tage Geld-zurück-Garantie!' },
  { text: 'Wenn das Leben dir Zitronen gibt, spritz den Saft in die Augen deiner Gegner. (Schul Dashboard™ haftet nicht für etwaige Schäden, die durch das beträufeln des Auges mit Saft, der aus einer Zitrusfrucht erhalten wurde, entstehen könnten. Das Befolgen der oben genannten Handlungen kann zu schweren Verletzungen und Nebenwirkungen führen und sollten nur unter der Aufsicht von trainierten Experten ausgeführt werden.)'},
  { text: '100% Fairtrade Codezeilen aus zertifiziertem Anbau!'},
  { text: 'gleich /gleích/, Adverb: unbestimmer Zeitpunkt in der Zukunft, wahrscheinlich aber nie'},
  { text: ''},
  { text: ''},
  { text: ''},
  { text: ''},
  { text: ''},
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
}
</style>