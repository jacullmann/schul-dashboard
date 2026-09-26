import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import hw from '@/api/api.ts';
import { hiddenByCourses } from '@/api/personalization';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type {
  Lesson,
  LessonGroup,
  ScheduleLayout,
  ScheduleRow,
  ScheduleSubject,
  Substitution,
} from '@/modules/schedule/types';
import { useI18n } from 'vue-i18n';
import { formatTimeOfDay } from '@/utils/time';
import {
  groupLessonsBySlot,
  lessonLastSlot,
  lessonSpan,
  lessonSubjectName,
  resolveLessonSubject,
  subjectsById,
} from '@/modules/schedule/utils/lesson';
import {
  lessonMinutes,
  scheduleConfigOrDefault,
  slotRangeMinutes,
  timeSlotsOf,
} from '@/modules/schedule/utils/slotTimes';
import { formatWeekday } from '@/modules/schedule/utils/weekday';

export interface UseScheduleOptions {
  autoLoad?: boolean;
}

export function useSchedule(options: UseScheduleOptions = { autoLoad: true }) {
  const { t, locale } = useI18n();
  const userStore = useUserStore();
  const { activeScheduleConfig, activeGroupType } = useAppAuth();

  const isPersonalized = computed(() => {
    return userStore.user?.personalized && userStore.user?.doneSetup;
  });

  const schedulesCoursesIndividually = computed(
    () => activeGroupType.value === 'abitur',
  );

  const lessons = ref<Lesson[]>([]);
  const subjects = ref<ScheduleSubject[]>([]);
  const substitutions = ref<Substitution[]>([]);
  const loadingSubs = ref(true);
  const loadingLessons = ref(true);
  const lessonsHiddenByServer = ref(0);

  const days = [1, 2, 3, 4, 5];

  const weekDates = computed<Record<number, Date>>(() => {
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

    const map: Record<number, Date> = {};
    days.forEach((day, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      map[day] = date;
    });
    return map;
  });

  const formatDayDate = (day: number): string => {
    const date = weekDates.value[day];
    return date
      ? new Intl.DateTimeFormat(locale.value, { day: 'numeric' }).format(date)
      : '';
  };

  const formatDayName = (day: number, weekday: 'long' | 'short' = 'long') =>
    formatWeekday(day, locale.value, weekday);

  const scheduleConfig = computed(() =>
    scheduleConfigOrDefault(activeScheduleConfig.value),
  );

  function getDisplayName(lesson: Lesson): string {
    if (lesson.isSubstitutedSubject && lesson.subject) {
      return lesson.subject;
    }

    const subjectName = lessonSubjectName(lesson);
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
      const [lessonRes, subjectRes] = await Promise.all([
        hw.get('/schedule'),
        hw.get('/schedule/subjects').catch(() => ({ data: [] })),
      ]);
      lessons.value = lessonRes.data;
      lessonsHiddenByServer.value = hiddenByCourses(lessonRes);
      subjects.value = subjectRes.data || [];
    } catch (error) {
      console.error('Error loading schedule:', error);
      lessons.value = [];
      lessonsHiddenByServer.value = 0;
      subjects.value = [];
    } finally {
      loadingLessons.value = false;
    }
  }

  const personalLessons = computed(() => {
    const result: Lesson[] = [];
    let hiddenCount = 0;
    if (!lessons.value || lessons.value.length === 0) {
      return { lessons: result, hiddenCount };
    }

    const subjectMap = subjectsById(subjects.value);

    const userCourses = userStore.user?.courses || [];
    const userCourseIds = new Set(userCourses.map((c: any) => c.courseId));
    const hasCourseSelection = !!userStore.user?.doneSetup;

    lessons.value.forEach((lesson) => {
      const {
        subjectId,
        subjects: subjectRef,
        courses,
        ownCourseId,
        ownCourse,
      } = resolveLessonSubject(lesson, subjectMap);

      // A lesson scheduled for one course is already personal — Abitur groups
      // schedule nearly all of them that way.
      if (ownCourseId) {
        result.push({
          ...lesson,
          _originalId: lesson.id,
          courseId: ownCourseId,
          courseName: lesson.courseName ?? ownCourse?.name,
          courses: ownCourse,
          subjects: subjectRef,
          outsideCourseSelection:
            hasCourseSelection && !userCourseIds.has(ownCourseId),
        });
        return;
      }

      // Without a course the lesson covers the whole group. In an Abitur group
      // that is what it means; a regular group splits it into the member's own
      // course of that subject.
      if (!isPersonalized.value || schedulesCoursesIndividually.value) {
        result.push({
          ...lesson,
          _originalId: lesson.id,
          subjects: subjectRef,
          outsideCourseSelection:
            hasCourseSelection &&
            !schedulesCoursesIndividually.value &&
            courses.length > 0 &&
            !courses.some((c) => userCourseIds.has(c.id)),
        });
        return;
      }

      if (courses.length === 0) {
        result.push({ ...lesson, _originalId: lesson.id });
        return;
      }

      const ownCourses = courses.filter((c) => userCourseIds.has(c.id));
      if (ownCourses.length === 0) hiddenCount++;

      ownCourses.forEach((c) => {
        result.push({
          ...lesson,
          id: `${lesson.id}_${c.id}`,
          _originalId: lesson.id,
          courseId: c.id,
          courseName: c.name,
          courses: { id: c.id, name: c.name },
          subjectId,
          subjects: subjectRef,
        });
      });
    });

    return { lessons: result, hiddenCount };
  });

  const expandedLessons = computed(() => personalLessons.value.lessons);

  /** Lessons the member does not see because of their course selection. */
  const hiddenLessonCount = computed(
    () => lessonsHiddenByServer.value + personalLessons.value.hiddenCount,
  );

  const effectiveLessons = computed<Lesson[]>(() => {
    const result: Lesson[] = [];

    const subMap = new Map<string, Substitution[]>();
    substitutions.value.forEach((sub) => {
      if (!subMap.has(sub.lessonId)) subMap.set(sub.lessonId, []);
      subMap.get(sub.lessonId)!.push(sub);
    });

    expandedLessons.value.forEach((original) => {
      const origId = original._originalId || original.id;
      const allSubs = subMap.get(origId) || [];

      const subs = allSubs.filter((sub) => {
        if (!sub.courseId) return true;
        return original.courseId && sub.courseId === original.courseId;
      });

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
            // @ts-expect-error Dynamic property assignment from substitution fields
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

  const timeSlots = computed(() => timeSlotsOf(scheduleConfig.value));

  const groupedLessons = computed<LessonGroup[]>(() =>
    groupLessonsBySlot(effectiveLessons.value),
  );

  const lastSlotByDayOf = (dayLessons: Lesson[]) => {
    const byDay = new Map<number, number>();
    dayLessons.forEach((lesson) => {
      byDay.set(
        lesson.day,
        Math.max(byDay.get(lesson.day) ?? 0, lessonLastSlot(lesson)),
      );
    });
    return byDay;
  };

  /** The last slot of each day that shows a lesson at all. */
  const lastShownSlotByDay = computed(() =>
    lastSlotByDayOf(effectiveLessons.value),
  );

  /** The last slot of each day the member actually has to attend. */
  const lastAttendedSlotByDay = computed(() =>
    lastSlotByDayOf(
      effectiveLessons.value.filter(
        (lesson) => !lesson.cancelled && !lesson.outsideCourseSelection,
      ),
    ),
  );

  const buildGroupStyle = (
    groupLessons: Lesson[],
    rowOfSlot: (slot: number) => number,
    mobileColumn: (desktopColumn: number) => number,
  ): Record<string, string> => {
    if (!groupLessons.length) return {};
    const firstLesson = groupLessons[0];
    if (!firstLesson) return {};
    const maxDuration = Math.max(...groupLessons.map(lessonSpan));
    const dayIndex = days.indexOf(firstLesson.day);
    const colStart = dayIndex + 2;
    const rowStart = rowOfSlot(firstLesson.slot);
    const rowEnd = rowOfSlot(firstLesson.slot + maxDuration - 1) + 1;
    const minHeight = Math.max(58, groupLessons.length * 54);
    return {
      '--col-desktop': `${colStart} / span 1`,
      '--col-mobile': `${mobileColumn(colStart)} / span 1`,
      gridColumn: `var(--col-desktop)`,
      gridRow: `${rowStart} / ${rowEnd}`,
      minHeight: `${minHeight}px`,
    };
  };

  const getGroupStyle = (groupLessons: Lesson[]) =>
    buildGroupStyle(
      groupLessons,
      (slot) => slot + 1,
      (column) => column - 1,
    );

  /*
   * Lesson rows interleaved with breaks. A day that ends where no break
   * follows gets a row of its own, so its end shows a time like a break does.
   */
  const buildLayout = (dayEndSlots: ReadonlySet<number>): ScheduleLayout => {
    const config = scheduleConfig.value;
    const rows: ScheduleRow[] = [];
    let gridRow = 2;
    for (let slot = 1; slot <= config.totalSlots; slot++) {
      const { start, end } = slotRangeMinutes(config, slot);
      const endTime = formatTimeOfDay(end);
      rows.push({
        kind: 'lesson',
        gridRow: gridRow++,
        slot,
        startTime: formatTimeOfDay(start),
      });

      const durationMins = config.breaks[slot] ?? 0;
      if (durationMins > 0 && slot < config.totalSlots) {
        rows.push({
          kind: 'break',
          gridRow: gridRow++,
          afterSlot: slot,
          startTime: endTime,
          durationMins,
        });
      } else if (dayEndSlots.has(slot)) {
        rows.push({
          kind: 'dayEnd',
          gridRow: gridRow++,
          afterSlot: slot,
          startTime: endTime,
        });
      }
    }

    const lessonGridRows = new Map<number, number>();
    rows.forEach((row) => {
      if (row.kind === 'lesson') lessonGridRows.set(row.slot, row.gridRow);
    });
    const gridRowOfSlot = (slot: number): number =>
      lessonGridRows.get(slot) ?? slot + 1 + (rows.length - config.totalSlots);

    return {
      rows,
      gridRowOfSlot,
      // On a phone every day is its own table, its lessons beside the time column.
      groupStyle: (groupLessons) =>
        buildGroupStyle(groupLessons, gridRowOfSlot, () => 2),
    };
  };

  const attendedDayEndSlots = (dayList: number[]): ReadonlySet<number> => {
    if (loadingLessons.value) return new Set();
    return new Set(
      dayList.flatMap((day) => lastAttendedSlotByDay.value.get(day) ?? []),
    );
  };

  /** The whole week side by side, sharing its rows. */
  const weekLayout = computed(() => buildLayout(attendedDayEndSlots(days)));

  /** Each day on its own, as a phone shows it. */
  const dayLayouts = computed(
    () =>
      new Map(
        days.map((day) => [day, buildLayout(attendedDayEndSlots([day]))]),
      ),
  );

  const now = ref(new Date());

  const updateTime = () => {
    now.value = new Date();
  };

  let timer: number | undefined;
  onMounted(() => {
    timer = window.setInterval(updateTime, 1000 * 60);
    if (options.autoLoad) {
      void loadSchedule();
      void loadSubstitutions();
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
        void loadSchedule();
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
      const maxEndMins = Math.max(
        ...lessonsToday.map(
          (lesson) => lessonMinutes(scheduleConfig.value, lesson).end,
        ),
      );

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

    const timeBlocks = groupedLessons.value
      .map(({ key, lessons: group }) => {
        const first = group[0];
        if (!first) return null;
        const dayIdx = dayMap[first.day] ?? -1;
        if (dayIdx === -1) return null;

        const { start, end } = slotRangeMinutes(
          scheduleConfig.value,
          first.slot,
          first.slot + Math.max(...group.map(lessonSpan)) - 1,
        );
        const startTotal = dayIdx * 24 * 60 + start;
        const endTotal = dayIdx * 24 * 60 + end;

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
    hiddenLessonCount,
    loadingSubs,
    loadingLessons,
    days,
    weekDates,
    scheduleConfig,
    timeSlots,
    weekLayout,
    dayLayouts,
    groupedLessons,
    lastShownSlotByDay,
    lastAttendedSlotByDay,
    currentDay,
    activeOrNextGroupKey,
    defaultDayIndex,
    getDisplayName,
    getGroupStyle,
    formatDayName,
    formatDayDate,
    lessons,
    substitutions,
    effectiveLessons,
  };
}
