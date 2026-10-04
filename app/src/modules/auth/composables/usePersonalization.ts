import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { apiErrorMessage } from '@/api/errors';
import { useToast } from '@/common/composables/useToast';
import { useUserStore } from '@/stores/userStore';

export function usePersonalization() {
  const { t } = useI18n();
  const userStore = useUserStore();
  const updating = ref(false);

  /**
   * Applies the setting optimistically and rolls it back if the save fails.
   * Resolves to the saved setting, or `null` when nothing was saved.
   */
  async function setPersonalization(value: boolean): Promise<boolean | null> {
    if (updating.value || !userStore.user) return null;

    const previous = userStore.user.personalized;
    updating.value = true;
    userStore.updateUser({ personalized: value });
    try {
      const { data } = await api.patch('/user/personalization', {
        personalized: value,
      });
      if (!data.ok) {
        userStore.updateUser({ personalized: previous });
        return null;
      }

      userStore.updateUser({ personalized: data.personalized });
      return data.personalized;
    } catch (e: unknown) {
      userStore.updateUser({ personalized: previous });
      useToast().error(apiErrorMessage(e, t('common.errors.update')));
      return null;
    } finally {
      updating.value = false;
    }
  }

  return { updating, setPersonalization };
}
