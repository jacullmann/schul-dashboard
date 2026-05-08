<script setup lang="ts">
const visible = ref(false);
const COOKIE_KEY = 'cookie_notice_dismissed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function dismiss() {
  document.cookie = `${COOKIE_KEY}=1; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  visible.value = false;
}

onMounted(() => {
  const dismissed = document.cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_KEY}=`));
  if (!dismissed) visible.value = true;
});
</script>

<template>
  <div
    v-if="visible"
    role="region"
    aria-label="Cookie notice"
    class="fixed bottom-4 right-4 z-[1200] w-[calc(100%-2rem)] max-w-sm sm:w-auto"
  >
    <div
      class="flex flex-col gap-3 px-4 py-3.5 rounded-xl border border-surface-border bg-canvas shadow-menu"
    >
      <p class="text-footnote text-on-ghost-muted leading-[1.6] m-0">
        We use only essential cookies to keep the site running.
        <NuxtLink
          to="/legal/privacy-policy"
          class="text-on-ghost underline hover:no-underline transition-colors"
        >
          Privacy Policy
        </NuxtLink>
      </p>
      <BaseButton variant="action" class="self-end" @click="dismiss"> Got it </BaseButton>
    </div>
  </div>
</template>
