<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  Calendar,
  Clock,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  BookOpen,
  MapPin,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from '@lucide/vue';

import { useUserStore } from '@/stores/userStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { formatSubjectDisplay } from '@/utils/subject-formatter';
import hw from '@/api/api.ts';

const { t, te, locale } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const subjectStore = useSubjectStore();
const { user } = storeToRefs(userStore);
const { activeGroupId, activeScheduleConfig } = useAppAuth();

// Initialize schedule composable
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

// Local states for tasks
const rawItems = ref<any[]>([]);
const checkedIds = ref<Set<string>>(new Set());
const loadingTasks = ref(false);
const now = ref(new Date());

// Periodic time update for next-lesson math
let timerInterval: number | undefined;

onMounted(async () => {
  await subjectStore.loadSubjects();
  timerInterval = window.setInterval(() => {
    now.value = new Date();
  }, 30000); // update every 30s
});

// Watch active group to trigger task fetch
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

// Interactive toggle checking
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
    // Revert state on error
    if (wasChecked) {
      checkedIds.value.add(id);
    } else {
      checkedIds.value.delete(id);
    }
    console.error('Error toggling check status:', err);
  }
}

// User greeting generator based on current hour
const greeting = computed(() => {
  const hr = now.value.getHours();
  if (hr >= 5 && hr < 12) return t('common.groups.good_morning');
  if (hr >= 12 && hr < 18) return t('common.groups.good_day');
  if (hr >= 18 && hr < 22) return t('common.groups.good_evening');
  return t('common.groups.good_night');
});

// Subject Display name formatter
const getSubjectName = (subject: string) => {
  return formatSubjectDisplay(subject, t, te);
};

// Filter personalized items setup
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

// Date filtering logic: fällig in den nächsten 2 Tagen (Heute & Morgen)
const filteredTasks = computed(() => {
  let list = rawItems.value.filter((item) => !checkedIds.value.has(item.id));

  // Personalized filter
  const isPersonalizedActive = user.value?.personalized && user.value?.doneSetup;
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

  // Next 2 days filter (Heute & Morgen)
  const startOfToday = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate());
  const endOfTomorrow = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate() + 1, 23, 59, 59, 999);

  return list.filter((item) => {
    const due = new Date(item.dueDate);
    return due >= startOfToday && due <= endOfTomorrow;
  });
});

// Sort by date ascending and take up to 3
const sortedTasks = computed(() => {
  const copy = [...filteredTasks.value];
  return copy
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);
});

// Find which of the displayed tasks was last edited
const lastEditedTaskId = computed(() => {
  if (!sortedTasks.value.length) return null;
  let newestTask = sortedTasks.value[0];
  let newestTime = new Date(newestTask.updatedAt || newestTask.createdAt || 0).getTime();

  for (let i = 1; i < sortedTasks.value.length; i++) {
    const task = sortedTasks.value[i];
    const time = new Date(task.updatedAt || task.createdAt || 0).getTime();
    if (time > newestTime) {
      newestTime = time;
      newestTask = task;
    }
  }
  return newestTask.id;
});

// Format dates nicely
const isToday = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = now.value;
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

const getDueDateLabel = (dateStr: string) => {
  if (isToday(dateStr)) return t('dashboard.tasks_overview.due_today');
  return t('dashboard.tasks_overview.due_tomorrow');
};

// Next upcoming lesson logic
const totalSlots = computed(() => activeScheduleConfig.value?.totalSlots ?? 9);
const lessonDurationMins = computed(() => activeScheduleConfig.value?.lessonDurationMins ?? 45);

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

const getSlotTime = (slot: number, duration: number) => {
  const startMins = slotStartMinutes.value[slot] ?? 0;
  let endMins = startMins;
  for (let d = 0; d < duration; d++) {
    endMins += lessonDurationMins.value;
    if (d < duration - 1) {
      endMins += breaks.value[slot + d] || 0;
    }
  }

  const formatMin = (total: number) => {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  return `${formatMin(startMins)} - ${formatMin(endMins)}`;
};

// Robust algorithm for extracting next upcoming lesson
const upcomingLesson = computed(() => {
  if (!effectiveLessons.value.length) return null;

  const todayIndex = (now.value.getDay() + 6) % 7; // 0 = Mon, ..., 4 = Fri, 5 = Sat, 6 = Sun
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

  // Find lessons starting in the future
  let futureLessons = lessonsWithTimes.filter((l) => l.startTotal > currentTotalWeekMinutes);

  if (futureLessons.length > 0) {
    futureLessons.sort((a, b) => a.startTotal - b.startTotal);
    return futureLessons[0].lesson;
  }

  // Weekend / after hours: wrap around to first lesson next week
  lessonsWithTimes.sort((a, b) => a.startTotal - b.startTotal);
  return lessonsWithTimes[0]?.lesson;
});

// Substituted subject name and info builders
const getDisplayName = (lesson: any): string => {
  if (lesson.isSubstitutedSubject && lesson.subject) {
    return lesson.subject;
  }

  const subjectName = lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
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

// Filter out active substitution changes for the current week
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
  return new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(date);
};
</script>

<template>
  <div class="space-y-6 animate-fade-up max-w-[1200px] mx-auto px-2 md:px-4 py-4">
    <!-- Header Welcome Banner -->
    <div
      class="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-bismuth-yellow via-bismuth-red to-bismuth-purple shadow-md"
    >
      <div
        class="bg-surface/90 dark:bg-charcoal/90 backdrop-blur-md rounded-[15px] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl md:text-3xl font-display font-bold tracking-tight text-on-ghost">
              {{ greeting }}, {{ user?.name || user?.username || 'User' }}!
            </h1>
            <Sparkles class="size-6 text-bismuth-yellow animate-pulse" />
          </div>
          <p class="text-on-ghost-muted text-sm md:text-base max-w-xl m-0">
            Willkommen zurück in deinem Schul-Dashboard. Hier findest du eine Übersicht deiner anstehenden Aufgaben und deines Stundenplans.
          </p>
        </div>

        <div class="flex items-center gap-2 self-start md:self-center">
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-highlight dark:bg-surface-highlight/10 border border-surface-border"
          >
            <Clock class="size-3.5 text-on-ghost-muted" />
            {{ new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Responsive Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- LEFT COLUMN: Tasks Overview -->
      <div
        class="group p-[1px] rounded-2xl bg-gradient-to-br from-bismuth-yellow via-bismuth-red to-bismuth-purple shadow-card transition-all duration-300 hover:shadow-lg flex flex-col"
      >
        <div
          class="h-full rounded-[15px] p-5 md:p-6 bg-surface/95 dark:bg-charcoal/95 backdrop-blur-md flex flex-col justify-between gap-6"
        >
          <!-- Tasks Header -->
          <div class="flex items-center justify-between gap-4 border-b border-surface-border/50 pb-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-bismuth-red/10 text-bismuth-red">
                <ClipboardList class="size-6" />
              </div>
              <div>
                <h2 class="text-lg md:text-xl font-display font-bold text-on-ghost leading-tight">
                  {{ t('dashboard.tasks_overview.title') }}
                </h2>
                <p class="text-on-ghost-muted text-xs md:text-sm m-0">
                  {{ t('dashboard.tasks_overview.subtitle') }}
                </p>
              </div>
            </div>

            <router-link
              v-if="activeGroupId"
              :to="{ name: 'group-items', params: { groupId: activeGroupId, type: 'all' } }"
              class="inline-flex items-center gap-1 text-xs font-semibold text-bismuth-red hover:underline group-hover:translate-x-0.5 transition-transform"
            >
              {{ t('dashboard.tasks_overview.view_all') }}
              <ChevronRight class="size-4" />
            </router-link>
          </div>

          <!-- Tasks Content -->
          <div class="flex-1 flex flex-col justify-center min-h-[220px]">
            <div v-if="loadingTasks" class="space-y-4 animate-pulse">
              <div v-for="i in 3" :key="i" class="h-16 bg-surface-highlight rounded-xl"></div>
            </div>

            <template v-else>
              <div v-if="sortedTasks.length > 0" class="space-y-3">
                <div
                  v-for="task in sortedTasks"
                  :key="task.id"
                  class="relative overflow-hidden rounded-xl border border-surface-border/60 bg-surface-highlight/40 dark:bg-surface-highlight/5 p-4 flex gap-3 items-start transition-all hover:bg-surface-highlight/70 dark:hover:bg-surface-highlight/10 hover:border-surface-hover-border/40"
                >
                  <BaseCheckbox
                    v-if="user"
                    :checked="checkedIds.has(task.id)"
                    class="mt-0.5 shrink-0"
                    @change="toggleCheck(task)"
                  />

                  <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <!-- Subject badge -->
                      <span
                        class="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-highlight border border-surface-border text-on-ghost-muted uppercase"
                      >
                        {{ getSubjectName(task.subject) }}
                      </span>

                      <!-- Due badge -->
                      <span
                        class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold"
                        :class="isToday(task.dueDate) ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'"
                      >
                        {{ getDueDateLabel(task.dueDate) }}
                      </span>

                      <!-- Last Edited badge -->
                      <span
                        v-if="task.id === lastEditedTaskId"
                        class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-warn/10 text-on-warn dark:text-yellow border border-warn/25 animate-pulse"
                      >
                        <RefreshCw class="size-2.5 shrink-0" />
                        {{ t('dashboard.tasks_overview.last_edited') }}
                      </span>
                    </div>

                    <h3 class="text-sm font-semibold text-on-ghost truncate m-0">
                      {{ task.title }}
                    </h3>

                    <p class="text-xs text-on-ghost-muted line-clamp-2 m-0">
                      {{ task.description || 'Keine Beschreibung.' }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Tasks Empty state -->
              <div v-else class="text-center py-8 space-y-3">
                <div class="inline-flex p-3 rounded-full bg-success/10 text-success">
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
      </div>

      <!-- RIGHT COLUMN: Schedule Overview -->
      <div
        class="group p-[1px] rounded-2xl bg-gradient-to-br from-bismuth-purple via-bismuth-violet to-bismuth-yellow shadow-card transition-all duration-300 hover:shadow-lg flex flex-col"
      >
        <div
          class="h-full rounded-[15px] p-5 md:p-6 bg-surface/95 dark:bg-charcoal/95 backdrop-blur-md flex flex-col justify-between gap-6"
        >
          <!-- Schedule Header -->
          <div class="flex items-center justify-between gap-4 border-b border-surface-border/50 pb-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-bismuth-purple/10 text-bismuth-purple">
                <Calendar class="size-6" />
              </div>
              <div>
                <h2 class="text-lg md:text-xl font-display font-bold text-on-ghost leading-tight">
                  {{ t('dashboard.schedule_overview.title') }}
                </h2>
                <p class="text-on-ghost-muted text-xs md:text-sm m-0">
                  {{ t('dashboard.schedule_overview.next_lesson') }} & changes
                </p>
              </div>
            </div>

            <router-link
              v-if="activeGroupId"
              :to="{ name: 'group-schedule', params: { groupId: activeGroupId } }"
              class="inline-flex items-center gap-1 text-xs font-semibold text-bismuth-purple hover:underline group-hover:translate-x-0.5 transition-transform"
            >
              {{ t('dashboard.schedule_overview.view_full') }}
              <ChevronRight class="size-4" />
            </router-link>
          </div>

          <!-- Schedule Content -->
          <div class="flex-1 flex flex-col gap-5 min-h-[220px]">
            <!-- TOP SUB-SECTION: Next Lesson -->
            <div class="space-y-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-on-ghost-subtle flex items-center gap-1">
                <Clock class="size-3.5" />
                {{ t('dashboard.schedule_overview.next_lesson') }}
              </h3>

              <div v-if="loadingLessons" class="h-20 bg-surface-highlight rounded-xl animate-pulse"></div>

              <template v-else>
                <div
                  v-if="upcomingLesson"
                  class="flex items-center justify-between gap-4 p-4 rounded-xl border border-surface-border bg-surface-highlight/40 dark:bg-surface-highlight/5"
                >
                  <div class="min-w-0 space-y-1">
                    <div class="flex items-center gap-1.5 text-xs text-on-ghost-muted">
                      <span class="font-bold text-on-ghost-subtle">{{ upcomingLesson.slot }}. Stunde</span>
                      <span>•</span>
                      <span>{{ getSlotTime(upcomingLesson.slot, upcomingLesson.duration) }}</span>
                      <span>•</span>
                      <span>{{ formatDayName(upcomingLesson.day) }}</span>
                    </div>

                    <h4 class="text-base font-bold text-on-ghost truncate m-0">
                      {{ getDisplayName(upcomingLesson) }}
                    </h4>

                    <div class="flex items-center gap-1 text-xs text-on-ghost-subtle">
                      <MapPin class="size-3.5 shrink-0" />
                      <span>{{ upcomingLesson.room || 'Kein Raum' }}</span>
                    </div>
                  </div>

                  <div class="shrink-0 flex flex-col gap-1.5 items-end">
                    <span
                      v-if="upcomingLesson.cancelled"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/15 text-danger border border-danger/20"
                    >
                      {{ t('dashboard.schedule_overview.cancelled') }}
                    </span>
                    <span
                      v-else-if="upcomingLesson.isSubstitutedSubject"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-bismuth-purple/15 text-bismuth-purple border border-bismuth-purple/20"
                    >
                      {{ t('dashboard.schedule_overview.substituted') }}
                    </span>
                  </div>
                </div>

                <div v-else class="p-4 rounded-xl border border-dashed border-surface-border text-center text-xs text-on-ghost-muted">
                  {{ t('dashboard.schedule_overview.no_more_lessons') }}
                </div>
              </template>
            </div>

            <!-- BOTTOM SUB-SECTION: Substitutions / Changes -->
            <div class="space-y-2 flex-1 flex flex-col">
              <h3 class="text-xs font-bold uppercase tracking-wider text-on-ghost-subtle flex items-center gap-1">
                <AlertTriangle class="size-3.5 text-yellow" />
                {{ t('dashboard.schedule_overview.substitutions') }}
              </h3>

              <div v-if="loadingSubs" class="h-16 bg-surface-highlight rounded-xl animate-pulse"></div>

              <template v-else>
                <div v-if="scheduleChanges.length > 0" class="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  <div
                    v-for="change in scheduleChanges"
                    :key="change.id"
                    class="flex items-center justify-between gap-3 p-3 rounded-lg border border-surface-border/40 bg-surface-highlight/25 dark:bg-surface-highlight/3 text-xs"
                  >
                    <div class="min-w-0">
                      <span class="font-semibold text-on-ghost-muted">
                        {{ formatDayName(change.day) }}, {{ change.slot }}. Stunde:
                      </span>
                      <span class="font-bold text-on-ghost ml-1">
                        {{ getDisplayName(change) }}
                      </span>
                      <!-- Comparison Details -->
                      <span v-if="change.room !== change._original?.room" class="text-on-ghost-subtle block mt-0.5 font-medium">
                        {{ t('dashboard.schedule_overview.room_change', { room: change.room }) }} (war: {{ change._original?.room || '?' }})
                      </span>
                    </div>

                    <span
                      v-if="change.cancelled"
                      class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger/10 text-danger"
                    >
                      {{ t('dashboard.schedule_overview.cancelled') }}
                    </span>
                    <span
                      v-else-if="change.isSubstitutedSubject"
                      class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-bismuth-purple/10 text-bismuth-purple"
                    >
                      {{ t('dashboard.schedule_overview.substituted') }}
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-warn/10 text-on-warn dark:text-yellow"
                    >
                      Änderung
                    </span>
                  </div>
                </div>

                <div v-else class="flex-1 flex items-center justify-center p-4 rounded-xl border border-dashed border-surface-border text-center text-xs text-on-ghost-muted">
                  {{ t('dashboard.schedule_overview.no_substitutions') }}
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped overrides to support seamless responsive lists */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
