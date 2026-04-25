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
  <PageHeader>
    {{ t('school.tables.schedule.title') }}
    <template #info>
      <InfoModal
        :tooltip="t('school.tables.schedule.infopop.tooltip')"
        :title="t('school.tables.schedule.title')"
      >
        <h3 class="text-h3 font-bold mb-2">
          {{ t('school.tables.schedule.infopop.description') }}
        </h3>
        <div
          v-for="(section, index) in tm(
            'school.tables.schedule.infopop.sections',
          )"
          :key="index"
          class="mb-4"
        >
          <h3 class="text-h3 font-bold mb-1">{{ section.title }}</h3>
          <p class="text-body text-on-ghost-muted m-0">{{ section.text }}</p>
        </div>
        <div class="w-full flex items-center justify-center mt-4">
          <img
            alt="Bild"
            src="https://res.cloudinary.com/dwysdpvcm/image/upload/v1765474359/Stundenplan_Ausfall_Grafik_b34pcq.webp"
            class="w-full h-full rounded-lg"
          />
        </div>
      </InfoModal>
    </template>
  </PageHeader>

  <div v-if="loading" class="text-[12px] text-on-ghost-muted my-2">
    {{ t('school.tables.schedule.loading') }}
  </div>
  <!-- <div v-else-if="isPersonalized" class="inline-flex items-center px-2 py-1 bg-surface border border-surface-border rounded-md text-body text-on-ghost shadow-input">
    {{ t('school.tables.schedule.personalized') }}
  </div> -->
</template>
