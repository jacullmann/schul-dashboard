import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import hw from '@/api/api.ts';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type { Lesson, Substitution, TimeSlot } from '@/modules/schedule/types';
import { useI18n } from 'vue-i18n';

export interface UseScheduleOptions {
  autoLoad?: boolean;
}

export function useSchedule(options: UseScheduleOptions = { autoLoad: true }) {
  const { t, locale } = useI18n();
  const userStore = useUserStore();
  const { activeScheduleConfig } = useAppAuth();

  const isPersonalized = computed(() => {
    return userStore.user?.personalized && userStore.user?.doneSetup;
  });

  const lessons = ref<Lesson[]>([]);
  const substitutions = ref<Substitution[]>([]);
  const loadingSubs = ref(true);
  const loadingLessons = ref(true);

  const days = [1, 2, 3, 4, 5];

  const weekDates = computed<Record<number, number>>(() => {
    const d = now.value;
    const jsDay = d.getDay();

    const offsetToMonday: Record<number, number> = {
      0: 1, // Sun  → next Mon (+1)
      1: 0, // Mon  → same Mon ( 0)
      2: -1, // Tue  → Mon (-1)
      3: -2, // Wed  → Mon (-2)
      4: -3, // Thu  → Mon (-3)
      5: -4, // Fri  → Mon (-4)
      6: 1, // Sat  → next Mon (+1)
    };

    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(d.getDate() + (offsetToMonday[jsDay] ?? 0));

    const map: Record<number, number> = {};
    days.forEach((day, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      map[day] = date.getDate();
    });
    return map;
  });

  const formatDayName = (day: number): string => {
    const date = new Date(Date.UTC(2024, 0, day, 12));
    return new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(
      date,
    );
  };

  const totalSlots = computed(
    () => activeScheduleConfig.value?.totalSlots ?? 9,
  );
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

  const breaks = computed<Record<number, number>>(
    () =>
      activeScheduleConfig.value?.breaks ?? {
        2: 25,
        3: 5,
        5: 40,
        7: 10,
      },
  );

  function getDisplayName(lesson: Lesson): string {
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
  }

  async function loadSubstitutions() {
    try {
      const { data } = await hw.get('/schedule/subs');
      substitutions.value = data;
    } catch (error) {
      console.error('Error loading substitutions:', error);
      substitutions.value = [];
    } finally {
      loadingSubs.value = false;
    }
  }

  async function loadSchedule() {
    loadingLessons.value = true;
    try {
      const { data } = await hw.get('/schedule');
      lessons.value = data;
    } catch (error) {
      console.error('Error loading schedule:', error);
      lessons.value = [];
    } finally {
      loadingLessons.value = false;
    }
  }

  const effectiveLessons = computed<Lesson[]>(() => {
    const result: Lesson[] = [];

    const subMap = new Map<string, Substitution[]>();
    substitutions.value.forEach((sub) => {
      if (!subMap.has(sub.lessonId)) subMap.set(sub.lessonId, []);
      subMap.get(sub.lessonId)!.push(sub);
    });

    lessons.value.forEach((original) => {
      const subs = subMap.get(original.id);

      if (!subs || subs.length === 0) {
        result.push({ ...original, _original: original });
        return;
      }

      subs.forEach((sub) => {
        if (sub.hide) return;

        const merged: Lesson = {
          ...original,
          _original: original,
        };

        for (const key of Object.keys(sub)) {
          const typedKey = key as keyof Substitution;
          if (
            sub[typedKey] !== null &&
            sub[typedKey] !== undefined &&
            sub[typedKey] !== ''
          ) {
            // @ts-expect-error
            merged[typedKey] = sub[typedKey];

            if (typedKey === 'subject') {
              merged.isSubstitutedSubject = true;
            }
          }
        }

        result.push(merged);
      });
    });

    return result;
  });

  const formatTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

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

  const timeSlots = computed<TimeSlot[]>(() => {
    const slots: TimeSlot[] = [];
    for (let i = 1; i <= totalSlots.value; i++) {
      const startMins = slotStartMinutes.value[i] ?? 0;
      const endMins = startMins + lessonDurationMins.value;
      slots.push({
        slot: i,
        time: `${formatTime(startMins)} - ${formatTime(endMins)}`,
      });
    }
    return slots;
  });

  const groupedLessons = computed(() => {
    const groups: Record<string, Lesson[]> = {};
    effectiveLessons.value.forEach((lesson) => {
      const key = `${lesson.day}-${lesson.slot}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(lesson);
    });
    return groups;
  });

  const getGroupStyle = (groupLessons: Lesson[]) => {
    if (!groupLessons.length) return {};
    const firstLesson = groupLessons[0];
    if (!firstLesson) return {};
    const maxDuration = Math.max(...groupLessons.map((l) => l.duration));
    const dayIndex = days.indexOf(firstLesson.day);
    const colStart = dayIndex + 2;
    const rowStart = firstLesson.slot + 1;
    return {
      '--col-desktop': `${colStart} / span 1`,
      '--col-mobile': `${colStart - 1} / span 1`,
      gridColumn: `var(--col-desktop)`,
      gridRow: `${rowStart} / span ${maxDuration}`,
    } as Record<string, string>;
  };

  const now = ref(new Date());

  const updateTime = () => {
    now.value = new Date();
  };

  let timer: number | undefined;
  onMounted(() => {
    timer = window.setInterval(updateTime, 1000 * 60);
    if (options.autoLoad) {
      loadSchedule();
      loadSubstitutions();
    }
  });

  watch(
    () => [userStore.user?.personalized, userStore.user?.courses],
    (newVal, oldVal) => {
      if (
        options.autoLoad &&
        oldVal !== undefined &&
        JSON.stringify(newVal) !== JSON.stringify(oldVal)
      ) {
        loadSchedule();
      }
    },
    { deep: false },
  );

  onUnmounted(() => {
    clearInterval(timer);
  });

  const dayMap: Record<number, number> = days.reduce(
    (acc, day, i) => {
      acc[day] = i;
      return acc;
    },
    {} as Record<number, number>,
  );

  const currentDay = computed(() => {
    const dayIndex = (now.value.getDay() + 6) % 7;
    if (dayIndex >= 0 && dayIndex < days.length) {
      return days[dayIndex];
    }
    return null;
  });

  const defaultDayIndex = computed(() => {
    const dayIndex = (now.value.getDay() + 6) % 7;
    if (dayIndex >= 5) {
      return 0;
    }

    const lessonsToday = effectiveLessons.value.filter(
      (l) => l.day === days[dayIndex],
    );
    if (lessonsToday.length > 0) {
      let maxEndMins = 0;
      lessonsToday.forEach((l) => {
        const startMins = slotStartMinutes.value[l.slot] ?? 0;
        let endMins = startMins;
        for (let d = 0; d < l.duration; d++) {
          endMins += lessonDurationMins.value;
          if (d < l.duration - 1) {
            endMins += breaks.value[l.slot + d] || 0;
          }
        }
        if (endMins > maxEndMins) {
          maxEndMins = endMins;
        }
      });

      const currentMinutes = now.value.getHours() * 60 + now.value.getMinutes();
      if (currentMinutes > maxEndMins + 10) {
        return (dayIndex + 1) % 5;
      }
    }
    return dayIndex;
  });

  const activeOrNextGroupKey = computed<string | null>(() => {
    const currentDayIndex = (now.value.getDay() + 6) % 7;
    const currentMinutes = now.value.getHours() * 60 + now.value.getMinutes();
    const currentTotalWeekMinutes = currentDayIndex * 24 * 60 + currentMinutes;

    const timeBlocks = Object.entries(groupedLessons.value)
      .map(([key, group]) => {
        const first = group[0];
        if (!first) return null;
        const dayIdx = dayMap[first.day] ?? -1;
        if (dayIdx === -1) return null;

        const maxDuration = Math.max(...group.map((l) => l.duration));
        const startMinsOfDay = slotStartMinutes.value[first.slot] ?? 0;

        let endMinsOfDay = startMinsOfDay;
        for (let d = 0; d < maxDuration; d++) {
          endMinsOfDay += lessonDurationMins.value;
          if (d < maxDuration - 1) {
            endMinsOfDay += breaks.value[first.slot + d] || 0;
          }
        }

        const startTotal = dayIdx * 24 * 60 + startMinsOfDay;
        const endTotal = dayIdx * 24 * 60 + endMinsOfDay;

        return { key, startTotal, endTotal };
      })
      .filter(
        (
          block,
        ): block is { key: string; startTotal: number; endTotal: number } =>
          block !== null,
      );

    const activeBlock = timeBlocks.find(
      (b) =>
        currentTotalWeekMinutes >= b.startTotal &&
        currentTotalWeekMinutes < b.endTotal,
    );
    if (activeBlock) return activeBlock.key;

    const pastBlocks = timeBlocks.filter(
      (b) => b.endTotal <= currentTotalWeekMinutes,
    );
    const futureBlocks = timeBlocks.filter(
      (b) => b.startTotal > currentTotalWeekMinutes,
    );

    futureBlocks.sort((a, b) => a.startTotal - b.startTotal);
    const nextBlock = futureBlocks[0];

    if (!nextBlock) return null;

    pastBlocks.sort((a, b) => b.endTotal - a.endTotal);
    const lastFinishedBlock = pastBlocks[0];

    if (lastFinishedBlock) {
      const minutesSinceFinish =
        currentTotalWeekMinutes - lastFinishedBlock.endTotal;
      const minutesUntilNext = nextBlock.startTotal - currentTotalWeekMinutes;

      if (minutesSinceFinish > 10 && minutesUntilNext > 120) {
        return null;
      }
    }

    return nextBlock.key;
  });

  return {
    isPersonalized,
    loadingSubs,
    loadingLessons,
    days,
    weekDates,
    timeSlots,
    groupedLessons,
    currentDay,
    activeOrNextGroupKey,
    defaultDayIndex,
    getDisplayName,
    getGroupStyle,
    formatDayName,
  };
}
