<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { KeyRound } from '@lucide/vue';
import { useUserStore } from '@/stores/userStore';

const { t } = useI18n();
const router = useRouter();
const { hasPassword } = storeToRefs(useUserStore());

function openPasswordForm() {
  void router.push({ name: 'account-password-edit' });
}
</script>

<template>
  <BaseFormContent>
    <div class="flex items-center gap-2 p-3 mx-auto">
      <div
        class="flex items-center justify-center size-11"
        :class="hasPassword ? 'text-success' : 'text-on-ghost-muted'"
      >
        <KeyRound :size="32" />
      </div>
      <div class="flex flex-col">
        <span class="text-sm text-on-ghost-muted">
          {{ t('auth.security.password') }}
        </span>
        <span
          class="text-base font-bold"
          :class="hasPassword ? 'text-on-ghost' : 'text-on-ghost-muted'"
        >
          {{
            hasPassword
              ? t('auth.security.password_set')
              : t('auth.security.password_not_set')
          }}
        </span>
      </div>
    </div>
    <p class="text-sm/relaxed text-on-ghost-muted m-0! font-sans">
      {{
        hasPassword
          ? t('auth.security.password_description')
          : t('auth.security.password_description_unset')
      }}
    </p>

    <BaseButton variant="action" full @click="openPasswordForm">
      {{
        hasPassword
          ? t('auth.change_password.title')
          : t('auth.set_password.title')
      }}
    </BaseButton>
  </BaseFormContent>
</template>
