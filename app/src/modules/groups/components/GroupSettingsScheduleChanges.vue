<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RefreshCw, Trash2 } from '@lucide/vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useGroupScheduleChanges } from '@/modules/groups/composables/useGroupScheduleChanges';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';
import { courseLabel, subjectLabel } from '@/utils/subject-formatter';

const i18n = useI18n();
const { t } = i18n;
const te = i18n.te.bind(i18n);

const { changes, loadingChanges, loadChanges, deleteChange } =
  useGroupScheduleChanges();
const { checkPermission } = useAppAuth();
const { subjects } = useSubjectAdmin();
const { schedulesCoursesIndividually } = useScheduleDisplay();

const canManageScheduleChanges = computed(() =>
  checkPermission('manage_schedule_changes'),
);
// An Abitur group runs too many courses for one to be moved or given another
// subject, so its changes only cancel a lesson or send it to another room.
const canRescheduleLessons = computed(
  () => !schedulesCoursesIndividually.value,
);

function changedCourseName(courseId?: string | null): string {
  if (!courseId) return t('groups.settings.schedule.changes.all_courses');
  for (const subject of subjects.value) {
    const course = subject.courses?.find(({ id }) => id === courseId);
    if (course) return courseLabel(course.name, t, te);
  }
  return t('groups.settings.schedule.changes.specific_course');
}
</script>

<template>
  <div>
    <PageHeader>
      {{ t('groups.settings.schedule.changes.title') }}

      <template #action>
        <BaseTooltip :content="t('common.buttons.refresh')">
          <BaseButton
            :disabled="loadingChanges"
            variant="ghost"
            :icon="RefreshCw"
            @click="loadChanges"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <div
      v-if="changes.length === 0 && !loadingChanges"
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      {{ t('groups.settings.schedule.changes.no_changes') }}
    </div>
    <BaseTableWrapper v-else>
      <table>
        <thead>
          <tr>
            <th v-if="canRescheduleLessons">
              {{ t('groups.settings.schedule.changes.table.subject') }}
            </th>
            <th>
              {{ t('groups.settings.schedule.changes.table.course') }}
            </th>
            <th>{{ t('groups.settings.schedule.changes.table.room') }}</th>
            <template v-if="canRescheduleLessons">
              <th>
                {{ t('groups.settings.schedule.changes.table.day') }}
              </th>
              <th>
                {{ t('groups.settings.schedule.changes.table.slot') }}
              </th>
            </template>
            <th>
              {{ t('groups.settings.schedule.changes.cancelled_label') }}
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="change in changes" :key="change.id">
            <td v-if="canRescheduleLessons">
              {{
                change.subject
                  ? subjectLabel(change.subject, t, te)
                  : t('common.selection.unknown')
              }}
            </td>
            <td>{{ changedCourseName(change.courseId) }}</td>
            <td>{{ change.room }}</td>
            <template v-if="canRescheduleLessons">
              <td>{{ change.day || '-' }}</td>
              <td>{{ change.slot || '-' }}</td>
            </template>
            <td class="text-danger">
              {{
                change.cancelled
                  ? t('groups.settings.schedule.changes.cancelled_label')
                  : '-'
              }}
            </td>
            <td class="py-0! px-2! min-w-0!">
              <BaseTooltip
                :content="t('common.buttons.delete')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!canManageScheduleChanges"
                  variant="ghost"
                  size="sm"
                  :icon="Trash2"
                  @click="deleteChange(change.id)"
                />
              </BaseTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseTableWrapper>
  </div>
</template>
