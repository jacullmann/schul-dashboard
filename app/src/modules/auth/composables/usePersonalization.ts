import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { apiErrorMessage } from '@/api/errors';
import { useToast } from '@/common/composables/useToast';
import { useUserStore } from '@/stores/userStore';

export function usePersonalization() {
  const { t } = useI18n();
  const userStore = useUserStore();
  const updating = ref(false);

  /** Resolves to the saved setting, or `null` when nothing was saved. */
  async function setPersonalization(value: boolean): Promise<boolean | null> {
    if (updating.value) return null;

    updating.value = true;
    try {
      const { data } = await hw.patch('/user/personalization', {
        personalized: value,
      });
      if (!data.ok) return null;

      userStore.updateUser({ personalized: data.personalized });
      useToast().success(
        value
          ? t('auth.personalization.enabled_toast')
          : t('auth.personalization.disabled_toast'),
      );
      return data.personalized;
    } catch (e: unknown) {
      useToast().error(apiErrorMessage(e, t('common.errors.update')));
      return null;
    } finally {
      updating.value = false;
    }
  }

  return { updating, setPersonalization };
}
