<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import hw from '../../api/api';
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  ArrowLeft,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const loading = ref(true);
const ok = ref(false);

const heading = computed(() => {
  if (loading.value)
    return {
      title: t('auth.verify_email.verifying'),
      description: t('auth.verify_email.wait'),
    };
  return ok.value
    ? {
        title: t('auth.verify_email.success'),
        description: t('auth.verify_email.success_description'),
      }
    : {
        title: t('auth.verify_email.error'),
        description: t('auth.verify_email.error_description'),
      };
});

onMounted(async () => {
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  try {
    const { data } = await hw.get('/auth/verify', { params: { token } });
    ok.value = data.ok;
  } catch {
    ok.value = false;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="card w-full max-w-150">
    <div
      class="flex flex-col items-center text-center py-10 px-5 max-md:py-5 max-md:px-2.5"
    >
      <div
        v-if="loading"
        class="size-16 mb-6 rounded-full border-4 border-ghost-border border-t-primary animate-spin max-[500px]:size-13 max-[500px]:mb-5"
      />
      <CheckCircle2
        v-else-if="ok"
        class="size-16 mb-6 text-success max-[500px]:size-13 max-[500px]:mb-5"
      />
      <XCircle
        v-else
        class="size-16 mb-6 text-danger max-[500px]:size-13 max-[500px]:mb-5"
      />

      <h1
        class="font-display text-[32px] font-semibold leading-[1.2] text-on-ghost mb-4 max-md:text-[26px] max-[500px]:text-2xl"
      >
        {{ heading.title }}
      </h1>
      <p
        class="text-base leading-normal text-on-ghost-muted max-w-120 mb-8 max-md:text-[15px] max-md:mb-6 max-[500px]:text-sm"
      >
        {{ heading.description }}
      </p>

      <div
        v-if="!loading && ok"
        class="flex items-start gap-3 w-full max-w-120 p-4 text-left bg-success/10 border border-success/30 rounded-md max-md:max-w-full max-[500px]:p-3.5"
      >
        <Info :size="20" class="shrink-0 mt-0.5 text-success" />
        <p class="text-sm leading-normal text-on-ghost">
          {{ t('auth.verify_email.close_tab') }}
        </p>
      </div>

      <template v-else-if="!loading">
        <div
          class="w-full max-w-120 p-5 mb-6 text-left bg-danger/8 border border-danger/25 rounded-md max-md:max-w-full max-[500px]:p-4"
        >
          <div
            class="flex items-center gap-2 mb-3 text-[15px] font-semibold text-danger"
          >
            <AlertTriangle :size="20" />
            <span>{{ t('auth.verify_email.possible_causes') }}</span>
          </div>
          <ul class="pl-6 space-y-1 text-sm leading-[1.8] text-on-ghost-muted">
            <li>{{ t('auth.verify_email.causes.used_link') }}</li>
            <li>{{ t('auth.verify_email.causes.expired_link') }}</li>
            <li>{{ t('auth.verify_email.causes.copied_link') }}</li>
          </ul>
        </div>

        <BaseButton
          class="mt-2"
          variant="ghost"
          :icon="ArrowLeft"
          @click="$router.push({ name: 'groups' })"
        >
          {{ t('common.buttons.back') }}
        </BaseButton>
      </template>
    </div>
  </div>
</template>
