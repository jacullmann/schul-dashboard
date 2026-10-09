<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { XCircle, AlertTriangle, ArrowLeft } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useConfirmSignUp } from '@/modules/auth/composables/useConfirmSignUp';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { checkAuthStatus, homeRoute } = useAppAuth();

const token = typeof route.query.token === 'string' ? route.query.token : '';

async function enterApp() {
  try {
    await checkAuthStatus();
    await userStore.fetchUser();
  } catch {
    // Signed in; navigate anyway and let the route guard re-sync.
  }
  await router.push(homeRoute.value);
}

const {
  password,
  passwordError,
  formError,
  submitting,
  linkInvalid,
  clearErrors,
  submit,
} = useConfirmSignUp(token, enterApp);
</script>

<template>
  <div class="w-full max-w-105">
    <template v-if="!linkInvalid">
      <div class="text-center mb-8">
        <h1 class="text-center!">
          {{ t('auth.verify_email.title') }}
        </h1>
        <p class="text-sm text-on-ghost-muted mt-1!">
          {{ t('auth.verify_email.description') }}
        </p>
      </div>

      <BaseForm :submit="submit" :loading="submitting" :error="formError">
        <template #content>
          <BaseFormGroup id="verify-password" :error="passwordError">
            <BaseLabel for="verify-password">
              {{ t('auth.login.password') }}
            </BaseLabel>
            <BaseInput
              id="verify-password"
              v-model="password"
              :placeholder="t('auth.login.password_placeholder')"
              type="password"
              autocomplete="current-password"
              autofocus
              required
              :aria-describedby="
                passwordError ? 'verify-password-error' : undefined
              "
              @input="clearErrors"
            />
          </BaseFormGroup>
        </template>

        <template #action-text>
          {{ t('auth.verify_email.submit') }}
        </template>
      </BaseForm>
    </template>

    <div v-else class="flex flex-col items-center text-center">
      <XCircle class="size-16 text-danger" />

      <h1 class="text-center! leading-[1.2] mt-6! mb-2!">
        {{ t('auth.verify_email.error') }}
      </h1>
      <div class="text-base leading-normal text-on-ghost-muted mb-8">
        {{ t('auth.verify_email.error_description') }}
      </div>

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
        @click="router.push({ name: 'groups' })"
      >
        {{ t('common.buttons.back') }}
      </BaseButton>
    </div>
  </div>
</template>
