<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { Copy, Check, RefreshCw } from '@lucide/vue';
import { useToast } from '@/common/composables/useToast';
import { useAbsoluteUrl } from '@/common/composables/useAbsoluteUrl';
import { inviteRoute } from '@/modules/auth/utils/routes';

const { t } = useI18n();
const auth = useAppAuth();
const toast = useToast();
const { absoluteUrl } = useAbsoluteUrl();

const props = defineProps<{
  open: boolean;
  token: string | null;
  groupId: string;
}>();

defineEmits<{
  (e: 'cancel'): void;
}>();

const currentToken = ref<string | null>(null);
const copied = ref(false);
const regenerating = ref(false);

watch(
  () => props.token,
  (newVal) => {
    currentToken.value = newVal;
    copied.value = false;
  },
  { immediate: true },
);

const inviteUrl = computed(() =>
  currentToken.value ? absoluteUrl(inviteRoute(currentToken.value)) : '',
);

const qrCodeUrl = ref<string | null>(null);

watch(
  inviteUrl,
  async (newUrl) => {
    if (!newUrl) {
      qrCodeUrl.value = null;
      return;
    }
    try {
      const { default: QRCode } = await import('qrcode');
      qrCodeUrl.value = await QRCode.toDataURL(newUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0F0F0F',
          light: '#FFFFFF',
        },
      });
    } catch (err) {
      console.error('Failed to generate QR code', err);
      qrCodeUrl.value = null;
    }
  },
  { immediate: true },
);

async function copyLink() {
  if (!inviteUrl.value) return;

  try {
    await navigator.clipboard.writeText(inviteUrl.value);
    copied.value = true;
    toast.success(t('auth.groups.invite.copied'));
    setTimeout(() => {
      copied.value = false;
    }, 3000);
  } catch {
    toast.error(t('auth.groups.errors.copy_failed'));
  }
}

async function regenerate() {
  if (regenerating.value) return;

  regenerating.value = true;
  try {
    const res = await auth.createInvite(props.groupId);
    if (res.ok && res.token) {
      currentToken.value = res.token;
      copied.value = false;
      toast.success(t('groups.settings.permissions.errors.update_success'));
    } else {
      toast.error(res.error || t('auth.groups.errors.regenerate_failed'));
    }
  } catch {
    toast.error(t('auth.groups.errors.regenerate_failed'));
  } finally {
    regenerating.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :submit="undefined"
    :loading="false"
    :cancel="undefined"
    @cancel="$emit('cancel')"
  >
    <template #title>{{ t('auth.groups.invite.modal_title') }}</template>

    <template #content>
      <p class="text-on-ghost-muted mb-4!">
        {{ t('auth.groups.invite.modal_desc') }}
      </p>

      <div v-if="qrCodeUrl" class="flex justify-center mx-auto mt-8">
        <img
          :src="qrCodeUrl"
          :alt="t('auth.groups.invite.qr_alt')"
          class="w-50 h-50 rounded-md"
        />
      </div>

      <BaseFormGroup id="invite-url-group">
        <div class="flex items-center gap-2 mt-4">
          <BaseInput
            id="invite-url-input"
            type="text"
            readonly
            :model-value="inviteUrl"
            class="w-full text-xs select-all!"
          />
          <BaseButton
            type="button"
            variant="ghost"
            :icon="copied ? Check : Copy"
            @click="copyLink"
          />
        </div>
      </BaseFormGroup>

      <BaseRow
        stack-on-mobile
        justify="start"
        class="md:flex-row-reverse! mt-8"
      >
        <BaseButton
          type="button"
          form
          variant="action"
          @click="$emit('cancel')"
        >
          {{ t('auth.groups.invite.done') }}
        </BaseButton>
        <BaseButton
          type="button"
          form
          surface
          variant="ghost"
          :disabled="regenerating"
          :icon="RefreshCw"
          @click="regenerate"
        >
          {{ t('auth.groups.invite.regenerate_button') }}
        </BaseButton>
      </BaseRow>
    </template>
  </BaseModal>
</template>
