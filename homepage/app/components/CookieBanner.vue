<script setup lang="ts">
const localePath = useLocalePath();

const dismissed = useCookie<boolean>('cookie_notice_dismissed', { maxAge: 60*60*24*180 });
const visible = computed(() => !dismissed.value);

function dismiss() {
  dismissed.value = true;
}
</script>

<template>
  <div
    v-if="visible"
    role="region"
    aria-label="Cookie notice"
    class="fixed bottom-4 right-4 z-[1200] w-[calc(100%-2rem)] max-w-sm sm:w-auto"
  >
    <div
      class="flex flex-col gap-3 px-4 py-3.5 rounded-xl border border-ghost-border bg-canvas shadow-menu"
    >
      <p class="text-xs text-on-ghost-muted leading-[1.6] m-0">
        We use only essential cookies to keep the site running.
        <BaseLink :to="localePath('legal-privacy-policy')"> Privacy Policy </BaseLink>
      </p>
      <BaseButton variant="action" class="self-end" @click="dismiss"> Got it </BaseButton>
    </div>
  </div>
</template>
