<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { usePushNotificationStore } from '@/stores/pushNotificationStore';
import { usePlatform } from '@/common/composables/usePlatform';
import { useToast } from '@/common/composables/useToast';
import SettingToggleCard from '@/modules/groups/components/SettingToggleCard.vue';

const { t } = useI18n();
const toast = useToast();
const { isIOS } = usePlatform();
const pushNotifications = usePushNotificationStore();
const { availability, isSubscribed, isBusy } = storeToRefs(pushNotifications);

const hint = computed<string | null>(() => {
  if (availability.value === 'available') return null;
  // iOS only offers Web Push to web apps added to the home screen.
  if (availability.value === 'unsupported' && isIOS) {
    return t('auth.account_settings.notifications.unsupported_ios');
  }
  return t(`auth.account_settings.notifications.${availability.value}`);
});

async function setEnabled(enabled: boolean) {
  try {
    if (enabled) {
      await pushNotifications.enable();
      if (isSubscribed.value) {
        toast.success(t('auth.account_settings.notifications.enabled'));
      }
    } else {
      await pushNotifications.disable();
    }
  } catch (error: unknown) {
    console.error('Changing push notifications failed:', error);
    toast.error(t('auth.account_settings.notifications.error'));
  }
}

const chatMessagesEnabled = computed({
  get: () => isSubscribed.value,
  set: (enabled: boolean) => void setEnabled(enabled),
});

onMounted(() => {
  pushNotifications.refresh().catch((error: unknown) => {
    console.error('Reading push notification state failed:', error);
  });
});
</script>

<template>
  <div class="flex flex-col gap-10">
    <section class="flex flex-col gap-3 max-w-160">
      <h3>{{ t('auth.account_settings.notifications.push_title') }}</h3>
      <p class="text-sm/relaxed text-on-ghost-muted m-0!">
        {{ t('auth.account_settings.notifications.push_description') }}
      </p>
      <SettingToggleCard
        v-model="chatMessagesEnabled"
        :title="t('auth.account_settings.notifications.chat_title')"
        :description="t('auth.account_settings.notifications.chat_description')"
        :disabled="availability !== 'available' || isBusy"
      />
      <p v-if="hint" class="text-sm/relaxed text-on-ghost-muted m-0!">
        {{ hint }}
      </p>
    </section>
  </div>
</template>
