<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();
</script>

<template>
  <div class="h-[100dvh] w-full flex flex-col bg-canvas">
    <h1 class="mx-4! my-2!">{{ t('chat.natural_intelligence.title') }}</h1>
    <div
      class="w-full max-w-[800px] mx-auto flex flex-col gap-2 min-h-full items-center"
    >
      <div class="h-[calc(100dvh-40dvh)] flex flex-col px-4 justify-center">
        <div class="text-center text-5xl! my-8 text-on-ghost">
          <i18n-t keypath="chat.natural_intelligence.landing.heading">
            <template #word>
              <b>{{ t('chat.natural_intelligence.landing.heading_word') }}</b>
            </template>
          </i18n-t>
        </div>
        <div class="text-lg mb-8 text-on-ghost-muted">
          {{ t('chat.natural_intelligence.landing.description') }}
        </div>

        <BaseRow justify="center">
          <BaseButton
            variant="action"
            @click="router.push({ name: 'natural-intelligence-chat' })"
            >{{ t('chat.natural_intelligence.landing.cta') }}</BaseButton
          >
        </BaseRow>
        <div class="text-sm mt-2 text-center text-on-ghost-muted font-medium">
          {{ t('chat.natural_intelligence.landing.no_signup') }}
        </div>
      </div>

      <div class="prose p-4">
        <h2 class="mt-32!">
          {{ t('chat.natural_intelligence.landing.how_it_works.title') }}
        </h2>
        <p>
          {{ t('chat.natural_intelligence.landing.how_it_works.intro') }}
        </p>
        <h3>
          {{ t('chat.natural_intelligence.landing.how_it_works.chat.title') }}
        </h3>
        <p>
          {{ t('chat.natural_intelligence.landing.how_it_works.chat.text') }}
        </p>
        <h3>
          {{ t('chat.natural_intelligence.landing.how_it_works.server.title') }}
        </h3>
        <p>
          {{ t('chat.natural_intelligence.landing.how_it_works.server.text') }}
        </p>
      </div>
    </div>
  </div>
</template>
