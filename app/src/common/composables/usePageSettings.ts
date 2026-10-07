import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { apiErrorMessage } from '@/api/errors';
import { useToast } from '@/common/composables/useToast';
import { useUserStore } from '@/stores/userStore';
import type { TaskPreferences } from '@/modules/tasks/types';
import type { SchedulePreferences } from '@/modules/schedule/types';

interface PageSettings {
  tasks: TaskPreferences;
  schedule: SchedulePreferences;
}

export type SettingsPage = keyof PageSettings;

// How the pages behaved before they had settings, so members who never change
// them see no difference.
const DEFAULT_PAGE_SETTINGS: PageSettings = {
  tasks: {
    archiveChecked: 'afterDueDate',
    groupByDueDate: true,
    archiveOtherCoursesPastDue: true,
  },
  schedule: {
    highlightNextLesson: true,
    nowMarker: true,
    nowMarkerTime: 'remaining',
    includeBreaksInFreeTime: true,
  },
};

/** A page's settings as the member chose them, the defaults filling the rest. */
export function usePageSettings<P extends SettingsPage>(page: P) {
  const userStore = useUserStore();
  const toast = useToast();
  const { t } = useI18n();

  const settings = computed<PageSettings[P]>(() => ({
    ...DEFAULT_PAGE_SETTINGS[page],
    ...userStore.user?.preferences?.[page],
  }));

  function storeSetting<K extends keyof PageSettings[P]>(
    key: K,
    value: PageSettings[P][K] | undefined,
  ) {
    const user = userStore.user;
    if (!user) return;
    user.preferences = {
      ...user.preferences,
      [page]: { ...user.preferences?.[page], [key]: value },
    };
  }

  /** Applied right away and undone if the server refuses it. */
  async function updateSetting<K extends keyof PageSettings[P]>(
    key: K,
    value: PageSettings[P][K],
  ) {
    if (!userStore.user) return;
    const stored = userStore.user.preferences?.[page] as
      Partial<PageSettings[P]> | undefined;
    const previous = stored?.[key];
    storeSetting(key, value);
    try {
      await api.patch('/user/preferences', { [page]: { [key]: value } });
    } catch (e) {
      storeSetting(key, previous);
      toast.error(apiErrorMessage(e, t('auth.account_settings.save_failed')));
    }
  }

  return { settings, updateSetting };
}
