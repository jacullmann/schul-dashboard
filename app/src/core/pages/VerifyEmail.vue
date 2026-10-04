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
  <div class="w-full max-w-120">
    <div class="flex flex-col items-center text-center">
      <BaseSpinner v-if="loading" size="64px" border-thickness="6px" />
      <CheckCircle2 v-else-if="ok" class="size-16 text-success" />
      <XCircle v-else class="size-16 text-danger" />

      <h1 class="text-center! leading-[1.2] mt-6! mb-2!">
        {{ heading.title }}
      </h1>
      <div class="text-base leading-normal text-on-ghost-muted mb-8">
        {{ heading.description }}
      </div>

      <div
        v-if="!loading && ok"
        class="flex items-start gap-2 w-full p-3 text-left bg-success-hover border border-success rounded-xl"
      >
        <Info :size="20" class="shrink-0 text-success" />
        <div class="text-sm leading-normal text-on-ghost">
          {{ t('auth.verify_email.close_tab') }}
        </div>
      </div>

      <template v-else-if="!loading">
        <div
          class="w-full p-3 text-left bg-danger-hover border border-danger rounded-xl"
        >
          <div class="flex gap-2 mb-2 text-danger">
            <AlertTriangle :size="20" />
            <span class="text-base/5 font-semibold">{{
              t('auth.verify_email.possible_causes')
            }}</span>
          </div>
          <ul
            class="flex flex-col gap-2 pl-5 list-disc text-sm text-on-ghost marker:text-danger"
          >
            <li>{{ t('auth.verify_email.causes.used_link') }}</li>
            <li>{{ t('auth.verify_email.causes.expired_link') }}</li>
            <li>{{ t('auth.verify_email.causes.copied_link') }}</li>
          </ul>
        </div>

        <BaseButton
          class="mt-4"
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
