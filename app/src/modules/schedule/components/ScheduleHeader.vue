<script setup lang="ts">
import InfoModal from '@/common/components/InfoModal.vue';
import { useI18n } from 'vue-i18n';

defineProps<{
  loading: boolean;
  isPersonalized: boolean;
}>();

const { t, tm } = useI18n();
</script>

<template>
  <div class="mb-2">
    <div class="flex items-center gap-1.5">
      <h2 class="text-h2 font-bold m-0 text-on-surface">
        {{ t('school.tables.schedule.title') }}
      </h2>
      <InfoModal
        :tooltip="t('school.tables.schedule.infopop.tooltip')"
        :title="t('school.tables.schedule.title')"
      >
        <h3 class="text-h3 font-bold mb-2">{{ t('school.tables.schedule.infopop.description') }}</h3>
        <div v-for="(section, index) in tm('school.tables.schedule.infopop.sections')" :key="index" class="mb-4">
          <h3 class="text-h3 font-bold mb-1">{{ section.title }}</h3>
          <p class="text-body text-on-surface-muted m-0">{{ section.text }}</p>
        </div>
        <div class="w-full flex items-center justify-center mt-4">
          <img
            alt="Bild"
            src="https://res.cloudinary.com/dwysdpvcm/image/upload/v1765474359/Stundenplan_Ausfall_Grafik_b34pcq.webp"
            class="w-full h-full rounded-lg"
          />
        </div>
      </InfoModal>
    </div>

    <div class="flex items-center gap-2 mt-2">
      <div v-if="loading" class="text-[12px] text-on-surface-muted">
        {{ t('school.tables.schedule.loading') }}
      </div>
      <div v-else-if="isPersonalized" class="inline-flex items-center px-2 py-1 bg-surface border border-surface-border rounded-md text-body text-on-surface shadow-input">
        {{ t('school.tables.schedule.personalized') }}
      </div>
    </div>
  </div>
</template>
