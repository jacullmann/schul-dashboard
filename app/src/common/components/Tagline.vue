<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, tm } = useI18n();

const randomIndex = ref<number | null>(null);
const isVisible = ref(false);

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

  const nextHoliday = holidays.find((h) => h.getTime() > now.getTime());

  if (!nextHoliday) return null;

  const diffTime = Math.abs(nextHoliday.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const displayQuote = computed(() => {
  if (randomIndex.value === null) return '';
  return t(`global.footer.quotes.${randomIndex.value}`, {
    daysToHoliday: getDaysToBerlinBreak() ?? '?',
  });
});

onMounted(() => {
  const quotes = tm('global.footer.quotes') as string[];

  if (quotes && quotes.length > 0) {
    randomIndex.value = Math.floor(Math.random() * quotes.length);

    setTimeout(() => {
      isVisible.value = true;
    }, 100);
  }
});
</script>

<template>
  <p
    v-if="isVisible"
    class="text-on-ghost-muted text-body font-sans italic font-medium m-0"
  >
    {{ displayQuote }}
  </p>
</template>
