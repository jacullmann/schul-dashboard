<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  CheckCircle2,
  ChevronRight,
  Pencil,
  ArrowUpRight,
  CalendarDays,
} from '@lucide/vue';

import { useUserStore } from '@/stores/userStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { formatSubjectDisplay } from '@/utils/subject-formatter';
import hw from '@/api/api.ts';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';

const { t, te, locale } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const subjectStore = useSubjectStore();
const { user } = storeToRefs(userStore);
const { activeGroupId, activeScheduleConfig, checkPermission } = useAppAuth();

const {
  lessons,
  substitutions,
  groupedLessons,
  effectiveLessons,
  timeSlots,
  loadingLessons,
  loadingSubs,
  isPersonalized,
} = useSchedule({ autoLoad: true });

const rawItems = ref<any[]>([]);
const checkedIds = ref<Set<string>>(new Set());
const loadingTasks = ref(false);
const now = ref(new Date());

let timerInterval: number | undefined;

onMounted(async () => {
  await subjectStore.loadSubjects();
  timerInterval = window.setInterval(() => {
    now.value = new Date();
  }, 30000);
});

watch(
  activeGroupId,
  async (newGroupId) => {
    if (newGroupId) {
      await fetchTasks();
    }
  },
  { immediate: true },
);

async function fetchTasks() {
  if (!activeGroupId.value) return;
  loadingTasks.value = true;
  try {
    const config = { headers: { 'x-tenant-id': activeGroupId.value } };
    const [itemsRes, checksRes] = await Promise.all([
      hw.get('/items', { params: { type: 'all' }, ...config }),
      hw.get('/user/checks', config),
    ]);

    rawItems.value = itemsRes.data || [];
    checkedIds.value = new Set(checksRes.data?.itemIds || []);
  } catch (err) {
    console.error('Failed to fetch tasks in dashboard:', err);
  } finally {
    loadingTasks.value = false;
  }
}

async function toggleCheck(item: any) {
  const id = item.id;
  const wasChecked = checkedIds.value.has(id);

  if (wasChecked) {
    checkedIds.value.delete(id);
  } else {
    checkedIds.value.add(id);
  }

  try {
    const config = activeGroupId.value
      ? { headers: { 'x-tenant-id': activeGroupId.value } }
      : {};

    if (wasChecked) {
      await hw.delete(`/user/items/${id}/check`, config);
    } else {
      await hw.post(`/user/items/${id}/check`, {}, config);
    }
  } catch (err) {
    if (wasChecked) {
      checkedIds.value.add(id);
    } else {
      checkedIds.value.delete(id);
    }
    console.error('Error toggling check status:', err);
  }
}

const getSubjectName = (subject: string) => {
  return formatSubjectDisplay(subject, t, te);
};

const userSubjects = computed(() => {
  const subjects = new Set<string>();
  if (
    !user.value?.personalized ||
    !user.value?.doneSetup ||
    !Array.isArray(user.value.courses)
  ) {
    return subjects;
  }

  user.value.courses.forEach((c: any) => {
    const subject = subjectStore.subjects.find((s) => s.id === c.subjectId);
    if (!subject) return;
    const course = subject.courses?.find((csc) => csc.id === c.courseId);
    if (course) {
      subjects.add(`${subject.name} - ${course.name}`);
      if (subject.category === 'extra' && subject.courses?.length === 1) {
        subjects.add(subject.name);
      }
    }
  });
  return subjects;
});

const filteredTasks = computed(() => {
  let list = rawItems.value.filter((item) => !checkedIds.value.has(item.id));

  const isPersonalizedActive =
    user.value?.personalized && user.value?.doneSetup;
  if (isPersonalizedActive && userSubjects.value.size > 0) {
    list = list.filter((item) => {
      const subjectLower = item.subject.toLowerCase();
      const subjectName = subjectLower.split(' - ')[0]?.trim();
      const categoryMatch = subjectStore.subjects.find(
        (s) => s.name.toLowerCase() === subjectName,
      );

      if (
        categoryMatch &&
        categoryMatch.category !== 'core' &&
        categoryMatch.courses &&
        categoryMatch.courses.length > 0
      ) {
        return userSubjects.value.has(item.subject);
      }
      return true;
    });
  }

  const startOfToday = new Date(
    now.value.getFullYear(),
    now.value.getMonth(),
    now.value.getDate(),
  );
  const endOfTomorrow = new Date(
    now.value.getFullYear(),
    now.value.getMonth(),
    now.value.getDate() + 2,
    23,
    59,
    59,
    999,
  );

  return list.filter((item) => {
    const due = new Date(item.dueDate);
    return due >= startOfToday && due <= endOfTomorrow;
  });
});

const sortedTasks = computed(() => {
  const copy = [...filteredTasks.value];
  return copy
    .sort((a, b) => {
      const dueDiff =
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dueDiff !== 0) {
        return dueDiff;
      }
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 3);
});

const totalSlots = computed(() => activeScheduleConfig.value?.totalSlots ?? 9);
const lessonDurationMins = computed(
  () => activeScheduleConfig.value?.lessonDurationMins ?? 45,
);

const startTimeHour = computed(() => {
  const time = activeScheduleConfig.value?.startTime ?? '08:00';
  return parseInt(time.split(':')[0], 10);
});

const startTimeMinute = computed(() => {
  const time = activeScheduleConfig.value?.startTime ?? '08:00';
  return parseInt(time.split(':')[1], 10);
});

const breaks = computed<Record<number, number>>(() => {
  return activeScheduleConfig.value?.breaks ?? { 2: 25, 3: 5, 5: 40, 7: 10 };
});

const slotStartMinutes = computed(() => {
  const map: Record<number, number> = {};
  let currentMetrics = startTimeHour.value * 60 + startTimeMinute.value;
  for (let i = 1; i <= totalSlots.value; i++) {
    map[i] = currentMetrics;
    const breakTime = breaks.value[i] || 0;
    currentMetrics += lessonDurationMins.value + breakTime;
  }
  return map;
});

const upcomingLesson = computed(() => {
  if (!effectiveLessons.value.length) return null;

  const todayIndex = (now.value.getDay() + 6) % 7;
  const currentMinutes = now.value.getHours() * 60 + now.value.getMinutes();
  const currentTotalWeekMinutes = todayIndex * 24 * 60 + currentMinutes;

  const lessonsWithTimes = effectiveLessons.value
    .filter((l) => !l.cancelled)
    .map((l) => {
      const startMinsOfDay = slotStartMinutes.value[l.slot] ?? 0;
      const startTotal = (l.day - 1) * 24 * 60 + startMinsOfDay;

      const maxDuration = l.duration || 1;
      let endMinsOfDay = startMinsOfDay;
      for (let d = 0; d < maxDuration; d++) {
        endMinsOfDay += lessonDurationMins.value;
        if (d < maxDuration - 1) {
          endMinsOfDay += breaks.value[l.slot + d] || 0;
        }
      }
      const endTotal = (l.day - 1) * 24 * 60 + endMinsOfDay;

      return { lesson: l, startTotal, endTotal };
    });

  if (!lessonsWithTimes.length) return null;

  const isLessonCourseTaken = (lesson: any): boolean => {
    if (!user.value?.courses || !Array.isArray(user.value.courses)) {
      return false;
    }
    const lessonCourseId = lesson.courseId || lesson.courses?.id;
    if (!lessonCourseId) {
      return false;
    }
    return user.value.courses.some((c: any) => c.courseId === lessonCourseId);
  };

  let futureLessons = lessonsWithTimes.filter(
    (l) => l.startTotal > currentTotalWeekMinutes,
  );

  if (futureLessons.length > 0) {
    futureLessons.sort((a, b) => {
      if (a.startTotal !== b.startTotal) {
        return a.startTotal - b.startTotal;
      }
      const aTaken = isLessonCourseTaken(a.lesson);
      const bTaken = isLessonCourseTaken(b.lesson);
      if (aTaken && !bTaken) return -1;
      if (!aTaken && bTaken) return 1;
      return 0;
    });
    return futureLessons[0]?.lesson;
  }

  lessonsWithTimes.sort((a, b) => {
    if (a.startTotal !== b.startTotal) {
      return a.startTotal - b.startTotal;
    }
    const aTaken = isLessonCourseTaken(a.lesson);
    const bTaken = isLessonCourseTaken(b.lesson);
    if (aTaken && !bTaken) return -1;
    if (!aTaken && bTaken) return 1;
    return 0;
  });
  return lessonsWithTimes[0]?.lesson;
});

const getDisplayName = (lesson: any): string => {
  if (lesson.isSubstitutedSubject && lesson.subject) {
    return lesson.subject;
  }

  const subjectName =
    lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
  const normalizedSubject = subjectName.toLowerCase();

  if (normalizedSubject === 'wpu1' || normalizedSubject === 'wpu2') {
    const courseName = lesson.courses?.name || lesson.courseName;
    if (courseName) {
      return `WPU ${t(`common.subjects.${courseName}`)}`;
    }
    return normalizedSubject === 'wpu1' ? 'WPU 1' : 'WPU 2';
  }

  if (normalizedSubject === 'enrichment') {
    return t('common.subjects.enrichment');
  }

  if (normalizedSubject === 'theater') {
    return t('common.subjects.theater');
  }

  if (subjectName) {
    const translationKey = `common.subjects.${subjectName}`;
    const translation = t(translationKey);
    return translation !== translationKey ? translation : subjectName;
  }

  return '';
};

const scheduleChanges = computed(() => {
  const changes = effectiveLessons.value.filter((l) => {
    const orig = l._original;
    if (!orig) return false;
    return l.cancelled || l.isSubstitutedSubject || l.room !== orig.room;
  });

  return [...changes].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.slot - b.slot;
  });
});

const formatDayName = (day: number): string => {
  const date = new Date(Date.UTC(2024, 0, day, 12));
  return new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(
    date,
  );
};

const hasLessons = computed(() => lessons.value && lessons.value.length > 0);
const canEditScheduleConfig = computed(() => checkPermission('edit_schedule'));

const isScheduleVisible = computed(() => {
  if (loadingLessons.value) return true;
  return hasLessons.value || canEditScheduleConfig.value;
});
</script>

<template>
  <div class="card">
    <div class="relative">
      <PageHeader>
        {{
          new Date().toLocaleDateString(locale, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })
        }}
        <Tagline />
        <template #info></template>
        <template #action>
          <BaseTooltip content="Edit Layout" placement="bottom">
            <BaseButton :icon="Pencil" />
          </BaseTooltip>
        </template>
      </PageHeader>
    </div>

    <div
      class="grid grid-cols-1 gap-8"
      :class="{ 'md:grid-cols-2': isScheduleVisible }"
    >
      <div class="flex flex-col">
        <PageHeader>
          {{ t('dashboard.tasks_overview.title') }}
          <template v-if="activeGroupId" #action>
            <BaseTooltip
              :content="t('dashboard.tasks_overview.view_all')"
              placement="bottom"
            >
              <BaseButton
                :icon="ChevronRight"
                @click="
                  $router.push({
                    name: 'group-tasks',
                    params: { groupId: activeGroupId },
                    query: { type: 'all' },
                  })
                "
              />
            </BaseTooltip>
          </template>
        </PageHeader>

        <div class="flex flex-col justify-center">
          <div v-if="loadingTasks" class="space-y-4 animate-pulse">
            <div
              v-for="i in 3"
              :key="i"
              class="h-16 bg-surface-highlight rounded-xl"
            ></div>
          </div>

          <template v-else>
            <div v-if="sortedTasks.length > 0" class="flex flex-col gap-3">
              <ItemCard
                v-for="(task, index) in sortedTasks"
                :key="task.id"
                :item="task"
                :index="index"
                :user="user"
                :title="task.title"
                :show-menu-trigger="false"
              >
                <template #checkbox>
                  <BaseCheckbox
                    :checked="checkedIds.has(task.id)"
                    @change="toggleCheck(task)"
                  />
                </template>

                <template #badges>
                  <div class="text-on-ghost-muted text-base">
                    {{ getSubjectName(task.subject) }}
                    •
                    {{ new Date(task.dueDate).toLocaleDateString() }}
                  </div>
                </template>

                <template #actions-pre>
                  <BaseTooltip content="View full task" placement="bottom">
                    <BaseButton
                      variant="ghost"
                      size="sm"
                      :icon="ArrowUpRight"
                      @click.stop="
                        $router.push({
                          name: 'group-tasks',
                          params: { groupId: activeGroupId },
                          query: {
                            type: 'all',
                            itemId: task.id,
                          },
                        })
                      "
                    />
                  </BaseTooltip>
                </template>
              </ItemCard>
            </div>

            <div v-else class="text-center py-8 space-y-3">
              <div
                class="inline-flex p-3 rounded-full bg-success/10 text-success"
              >
                <CheckCircle2 class="size-10" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-on-ghost text-center">
                  {{ t('dashboard.tasks_overview.no_tasks') }}
                </h3>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="isScheduleVisible" class="flex flex-col">
        <PageHeader>
          {{ t('dashboard.schedule_overview.title') }}
          <template v-if="activeGroupId && hasLessons" #action>
            <BaseTooltip
              :content="t('dashboard.schedule_overview.view_full')"
              placement="bottom"
            >
              <BaseButton
                :icon="ChevronRight"
                @click="
                  $router.push({
                    name: 'group-schedule',
                    params: { groupId: activeGroupId },
                  })
                "
              />
            </BaseTooltip>
          </template>
        </PageHeader>

        <div
          v-if="loadingLessons || loadingSubs"
          class="flex-1 flex flex-col gap-5 min-h-[220px]"
        >
          <div class="space-y-2">
            <h3>
              {{ t('dashboard.schedule_overview.next_lesson') }}
            </h3>
            <div
              class="h-20 bg-surface-highlight rounded-xl animate-pulse"
            ></div>
          </div>

          <div class="space-y-2 flex-1 flex flex-col">
            <h3>
              {{ t('dashboard.schedule_overview.substitutions') }}
            </h3>
            <div
              class="h-16 bg-surface-highlight rounded-xl animate-pulse"
            ></div>
          </div>
        </div>

        <div
          v-else-if="hasLessons"
          class="flex-1 flex flex-col gap-5 min-h-[220px]"
        >
          <div class="space-y-2">
            <h3>
              {{ t('dashboard.schedule_overview.next_lesson') }}
            </h3>

            <div
              v-if="upcomingLesson"
              class="flex items-center justify-between gap-4 px-3 py-2 rounded-lg border border-surface-border bg-surface"
            >
              <div class="min-w-0">
                <div class="text-xs text-on-ghost-muted mb-0.5">
                  {{ upcomingLesson.slot }}. Stunde
                </div>

                <div class="text-base font-bold text-on-ghost truncate m-0">
                  {{ getDisplayName(upcomingLesson) }}
                </div>

                <div class="text-sm text-on-ghost-muted">
                  {{ upcomingLesson.room || 'Kein Raum' }}
                </div>
              </div>

              <div class="shrink-0 flex flex-col gap-1.5 items-end">
                <span
                  v-if="upcomingLesson.cancelled"
                  class="px-2 py-0.5 rounded text-xs font-bold bg-danger/15 text-danger border border-danger/20"
                >
                  {{ t('dashboard.schedule_overview.cancelled') }}
                </span>
                <span
                  v-else-if="upcomingLesson.isSubstitutedSubject"
                  class="px-2 py-0.5 rounded text-xs font-bold bg-bismuth-purple/15 text-bismuth-purple border border-bismuth-purple/20"
                >
                  {{ t('dashboard.schedule_overview.substituted') }}
                </span>
              </div>
            </div>

            <div
              v-else
              class="p-4 rounded-xl border border-dashed border-surface-border text-center text-xs text-on-ghost-muted"
            >
              {{ t('dashboard.schedule_overview.no_more_lessons') }}
            </div>
          </div>

          <div class="space-y-2 flex-1 flex flex-col">
            <h3>
              {{ t('dashboard.schedule_overview.substitutions') }}
            </h3>

            <div
              v-if="scheduleChanges.length > 0"
              class="space-y-2 max-h-[120px] overflow-y-auto pr-1"
            >
              <div
                v-for="change in scheduleChanges"
                :key="change.id"
                class="flex items-center justify-between gap-3 p-3 rounded-lg border border-surface-border bg-surface text-xs"
              >
                <div class="min-w-0">
                  <span class="font-semibold text-on-ghost-muted">
                    {{ formatDayName(change.day) }}, {{ change.slot }}. Stunde:
                  </span>
                  <span class="font-bold text-on-ghost ml-1">
                    {{ getDisplayName(change) }}
                  </span>
                  <span
                    v-if="change.room !== change._original?.room"
                    class="text-on-ghost-subtle block mt-0.5 font-medium"
                  >
                    {{
                      t('dashboard.schedule_overview.room_change', {
                        room: change.room,
                      })
                    }}
                    (war: {{ change._original?.room || '?' }})
                  </span>
                </div>

                <span
                  v-if="change.cancelled"
                  class="px-1.5 py-0.5 rounded text-xs font-bold bg-danger/10 text-danger"
                >
                  {{ t('dashboard.schedule_overview.cancelled') }}
                </span>
                <span
                  v-else-if="change.isSubstitutedSubject"
                  class="px-1.5 py-0.5 rounded text-xs font-bold bg-bismuth-purple/10 text-bismuth-purple"
                >
                  {{ t('dashboard.schedule_overview.substituted') }}
                </span>
                <span
                  v-else
                  class="px-1.5 py-0.5 rounded text-xs font-bold bg-warn/10 text-on-warn dark:text-yellow"
                >
                  Änderung
                </span>
              </div>
            </div>

            <div
              v-else
              class="flex-1 flex items-center justify-center p-4 rounded-xl border border-dashed border-surface-border text-center text-xs text-on-ghost-muted"
            >
              {{ t('dashboard.schedule_overview.no_substitutions') }}
            </div>
          </div>
        </div>

        <div
          v-else-if="canEditScheduleConfig"
          class="flex-1 flex items-center justify-center p-6 min-h-[220px]"
        >
          <BaseEmptyState
            :primary-action="
              () =>
                $router.push({
                  name: 'group-admin',
                  params: { groupId: activeGroupId, tab: 'schedule' },
                })
            "
            :icon="CalendarDays"
          >
            <template #message>{{
              t('dashboard.schedule_overview.setup_cta')
            }}</template>
            <template #primary-action-label>{{
              t('dashboard.schedule_overview.setup_button')
            }}</template>
          </BaseEmptyState>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
