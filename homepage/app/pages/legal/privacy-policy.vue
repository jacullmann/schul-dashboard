<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: `${t('legal.privacy.title')} — schul-dashboard`,
  description: t('legal.privacy.description'),
  robots: 'noindex, follow',
});

const dataItems = [
  'legal.privacy.dataCollected.item0',
  'legal.privacy.dataCollected.item1',
  'legal.privacy.dataCollected.item2',
];

const rightsItems = [
  'legal.privacy.rights.item0',
  'legal.privacy.rights.item1',
  'legal.privacy.rights.item2',
  'legal.privacy.rights.item3',
  'legal.privacy.rights.item4',
  'legal.privacy.rights.item5',
];
</script>

<template>
  <LegalPage :title="t('legal.privacy.title')" :description="t('legal.privacy.description')">
    <LegalSection :title="t('legal.privacy.intro.title')">
      <p class="text-on-surface-muted leading-[1.7] m-0">{{ t('legal.privacy.intro.text') }}</p>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.controller.title')">
      <p class="text-on-surface-muted leading-[1.7] m-0">
        {{ t('legal.privacy.controller.text') }}
      </p>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.dataCollected.title')">
      <ul class="mt-1 flex flex-col gap-2 pl-5 list-disc">
        <li v-for="key in dataItems" :key="key" class="text-on-surface-muted leading-[1.6]">
          {{ t(key) }}
        </li>
      </ul>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.purpose.title')">
      <p class="text-on-surface-muted leading-[1.7] m-0">{{ t('legal.privacy.purpose.text') }}</p>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.retention.title')">
      <p class="text-on-surface-muted leading-[1.7] m-0">{{ t('legal.privacy.retention.text') }}</p>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.rights.title')">
      <p class="text-on-surface-muted leading-[1.7] mb-3">{{ t('legal.privacy.rights.intro') }}</p>
      <ul class="flex flex-col gap-2 pl-5 list-disc">
        <li v-for="key in rightsItems" :key="key" class="text-on-surface-muted leading-[1.6]">
          {{ t(key) }}
        </li>
      </ul>
      <p class="text-on-surface-muted leading-[1.7] mt-4 mb-0">
        {{ t('legal.privacy.rights.contact') }}
      </p>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.cookies.title')">
      <p class="text-on-surface-muted leading-[1.7] m-0">{{ t('legal.privacy.cookies.text') }}</p>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.security.title')">
      <p class="text-on-surface-muted leading-[1.7] m-0">{{ t('legal.privacy.security.text') }}</p>
    </LegalSection>

    <LegalSection :title="t('legal.privacy.changes.title')">
      <p class="text-on-surface-muted leading-[1.7] m-0">{{ t('legal.privacy.changes.text') }}</p>
    </LegalSection>
  </LegalPage>
</template>
