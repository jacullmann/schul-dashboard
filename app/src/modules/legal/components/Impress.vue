<script setup lang="ts">
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n();
</script>

<template>
  <div>
    <h2>{{ t('legal.imprint.title') }}</h2>
    <p>{{ t('legal.imprint.info.name') }}</p>
    <p>{{ t('legal.imprint.info.address') }}</p>

    <h3>{{ t('contact.contact.title') }}</h3>
    <p>{{ t('contact.contact.email') }}: kontakt@schul-dashboard.com</p><br>

    <p>{{ t('legal.imprint.disclaimer') }}</p>
  </div>
</template>