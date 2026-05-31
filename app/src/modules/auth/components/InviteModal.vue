<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useModalStore } from '@/stores/modalStore';
import { Copy, Check, RefreshCw } from '@lucide/vue';
import { useToast } from '@/common/composables/useToast';
import QRCode from 'qrcode';

const { t } = useI18n();
const auth = useAppAuth();
const modalStore = useModalStore();
const toast = useToast();

const props = defineProps<{
  open: boolean;
  token: string | null;
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

const inviteUrl = computed(() => {
  if (!currentToken.value) return '';
  return `${window.location.origin}/invite/${currentToken.value}`;
});

const qrCodeUrl = ref<string | null>(null);

watch(
  inviteUrl,
  async (newUrl) => {
    if (!newUrl) {
      qrCodeUrl.value = null;
      return;
    }
    try {
      qrCodeUrl.value = await QRCode.toDataURL(newUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
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
  } catch (err) {
    toast.error('Failed to copy to clipboard');
  }
}

async function regenerate() {
  if (regenerating.value) return;

  regenerating.value = true;
  try {
    const res = await auth.createInvite();
    if (res.ok && res.token) {
      currentToken.value = res.token;
      copied.value = false;
      modalStore.inviteModalToken = res.token;
      toast.success(t('admin.permissions.errors.update_success'));
    } else {
      toast.error(res.error || 'Failed to regenerate invite link');
    }
  } catch (err) {
    toast.error('Failed to regenerate invite link');
  } finally {
    regenerating.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="$emit('cancel')"
    :submit="undefined"
    :loading="false"
    :cancel="undefined"
  >
    <template #title>{{ t('auth.groups.invite.modal_title') }}</template>

    <template #content>
      <p class="text-sm text-on-ghost-muted mb-4 leading-relaxed">
        {{ t('auth.groups.invite.modal_desc') }}
      </p>

      <div
        v-if="qrCodeUrl"
        class="flex justify-center p-2 bg-white rounded-xl mx-auto mb-4"
      >
        <img :src="qrCodeUrl" :alt="t('auth.groups.invite.qr_alt')" class="w-[200px] h-[200px]" />
      </div>

      <BaseFormGroup id="invite-url-group">
        <div class="flex items-center gap-2 mt-1">
          <div class="relative flex-1">
            <BaseInput
              id="invite-url-input"
              type="text"
              readonly
              :modelValue="inviteUrl"
              class="w-full bg-ghost/30 pr-10 font-mono text-xs select-all border border-canvas-border focus:border-primary!"
            />
          </div>
          <BaseButton
            type="button"
            @click="copyLink"
            :variant="copied ? 'ghost' : 'primary'"
            class="flex-shrink-0 min-w-32 justify-center gap-2"
          >
            <component :is="copied ? Check : Copy" :size="16" />
            <span>{{
              copied
                ? t('auth.groups.invite.copied')
                : t('auth.groups.invite.copy_button')
            }}</span>
          </BaseButton>
        </div>
      </BaseFormGroup>

      <div class="flex justify-end gap-2 mt-6">
        <BaseButton
          type="button"
          variant="ghost"
          @click="regenerate"
          :disabled="regenerating"
          class="gap-2"
        >
          <RefreshCw
            :size="16"
            :class="{ 'animate-spin': regenerating }"
            class="text-on-ghost-muted"
          />
          <span>{{ t('auth.groups.invite.regenerate_button') }}</span>
        </BaseButton>
        <BaseButton type="button" variant="primary" @click="$emit('cancel')">
          {{ t('auth.groups.invite.close') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
#invite-url-input {
  cursor: text;
}
</style>
