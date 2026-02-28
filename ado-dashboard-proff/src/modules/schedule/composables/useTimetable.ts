import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import hw from "@/api/hwApi";
import { useUserStore } from '@/stores/userStore';
import type { Lesson, Substitution, TimeSlot } from '@/modules/schedule/types';
import { useI18n } from 'vue-i18n';

export function useTimetable() {
    const { t } = useI18n();
    const userStore = useUserStore();

    const isPersonalized = computed(() => {
        return userStore.user?.personalized && userStore.user?.doneSetup;
    });

    const lessons = ref<Lesson[]>([]);
    const substitutions = ref<Substitution[]>([]);
    const loadingSubs = ref(true);
    const loadingLessons = ref(true);

    const days = Array.from({ length: 5 }).map((_, i) => {
        const date = new Date(Date.UTC(2024, 0, i + 1, 12)); // 2024-01-01 is Monday
        return new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date);
    });
    const totalSlots = 9;
    const lessonDurationMins = 45;
    const startTimeHour = 8;
    const startTimeMinute = 0;

    const breaks: Record<number, number> = {
        2: 25,
        3: 5,
        5: 40,
        7: 10
    };
    const SUBJECT_ABBR_TO_NAME: Record<string, string> = {
        'INF': 'global.subjects.cs',
        'ENG': 'global.subjects.english',
        'BI': 'global.subjects.biology',
        'LA': 'global.subjects.latin',
        'GEWI': 'global.subjects.history',
        'DE': 'global.subjects.german',
        'MA': 'global.subjects.math',
        'MU': 'global.subjects.music'
    };

    function getDisplayName(lesson: Lesson): string {
        if (lesson.subject?.startsWith('WPU') && lesson.subject_abbr) {
            const fachName = SUBJECT_ABBR_TO_NAME[lesson.subject_abbr];
            if (fachName) {
                return `${t(fachName)} WPU`;
            }
        }
        return lesson.subject;
    }

    async function loadSubstitutions() {
        try {
            const { data } = await hw.get('/api/timetable/subs');
            substitutions.value = data;
        } catch (error) {
            console.error('Fehler beim Laden der Substitutions:', error);
            substitutions.value = [];
        } finally {
            loadingSubs.value = false;
        }
    }

    async function loadTimetable() {
        loadingLessons.value = true;
        try {
            const { data } = await hw.get('/api/timetable');
            lessons.value = data;
        } catch (error) {
            console.error('Fehler beim Laden des Stundenplans:', error);
            lessons.value = [];
        } finally {
            loadingLessons.value = false;
        }
    }

    const effectiveLessons = computed<Lesson[]>(() => {
        const result: Lesson[] = [];

        const subMap = new Map<number, Substitution[]>();
        substitutions.value.forEach(sub => {
            if (!subMap.has(sub.lessonId)) subMap.set(sub.lessonId, []);
            subMap.get(sub.lessonId)!.push(sub);
        });

        lessons.value.forEach(original => {
            const subs = subMap.get(original.id);

            if (!subs || subs.length === 0) {
                result.push({ ...original, _original: original });
                return;
            }

            subs.forEach(sub => {
                if (sub.hide) return;

                const merged: Lesson = {
                    ...original,
                    ...sub,
                    _original: original
                };

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
        let currentMetrics = (startTimeHour * 60) + startTimeMinute;
        for (let i = 1; i <= totalSlots; i++) {
            map[i] = currentMetrics;
            const breakTime = breaks[i] || 0;
            currentMetrics += lessonDurationMins + breakTime;
        }
        return map;
    });

    const timeSlots = computed<TimeSlot[]>(() => {
        const slots: TimeSlot[] = [];
        for (let i = 1; i <= totalSlots; i++) {
            const startMins = slotStartMinutes.value[i];
            const endMins = startMins + lessonDurationMins;
            slots.push({ slot: i, time: `${formatTime(startMins)} - ${formatTime(endMins)}` });
        }
        return slots;
    });

    const groupedLessons = computed(() => {
        const groups: Record<string, Lesson[]> = {};
        effectiveLessons.value.forEach(lesson => {
            const key = `${lesson.day}-${lesson.slot}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(lesson);
        });
        return groups;
    });

    const getGroupStyle = (groupLessons: Lesson[]) => {
        if (!groupLessons.length) return {};
        const firstLesson = groupLessons[0];
        const maxDuration = Math.max(...groupLessons.map(l => l.duration));
        const dayIndex = days.indexOf(firstLesson.day);
        const colStart = dayIndex + 2;
        const rowStart = firstLesson.slot + 1;
        return {
            gridColumn: `${colStart} / ${colStart + 1}`,
            gridRow: `${rowStart} / span ${maxDuration}`
        };
    };

    const now = ref(new Date());

    const updateTime = () => {
        now.value = new Date();
    };

    let timer: number | undefined;
    onMounted(() => {
        timer = window.setInterval(updateTime, 1000 * 60);
        loadTimetable();
        loadSubstitutions();
    });

    watch(
        () => [
            userStore.user?.personalized,
            userStore.user?.enrKurs,
            userStore.user?.wpuKurs1,
            userStore.user?.wpuKurs2,
            userStore.user?.theater
        ],
        (newVal, oldVal) => {
            if (oldVal !== undefined && JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
                loadTimetable();
            }
        },
        { deep: false }
    );

    onUnmounted(() => {
        clearInterval(timer);
    });

    const dayMap: Record<string, number> = days.reduce((acc, day, i) => {
        acc[day] = i;
        return acc;
    }, {} as Record<string, number>);

    // New computed property to get the name of the current day
    const currentDayName = computed(() => {
        const dayIndex = (now.value.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        if (dayIndex >= 0 && dayIndex < days.length) {
            return days[dayIndex];
        }
        return null;
    });

    const activeOrNextGroupKey = computed<string | null>(() => {
        const currentDayIndex = (now.value.getDay() + 6) % 7;
        const currentMinutes = now.value.getHours() * 60 + now.value.getMinutes();
        const currentTotalWeekMinutes = (currentDayIndex * 24 * 60) + currentMinutes;

        const timeBlocks = Object.entries(groupedLessons.value).map(([key, group]) => {
            const first = group[0];
            const dayIdx = dayMap[first.day] ?? -1;
            if (dayIdx === -1) return null;

            const maxDuration = Math.max(...group.map(l => l.duration));
            const startMinsOfDay = slotStartMinutes.value[first.slot];

            let endMinsOfDay = startMinsOfDay;
            for (let d = 0; d < maxDuration; d++) {
                endMinsOfDay += lessonDurationMins;
                if (d < maxDuration - 1) {
                    endMinsOfDay += (breaks[first.slot + d] || 0);
                }
            }

            const startTotal = (dayIdx * 24 * 60) + startMinsOfDay;
            const endTotal = (dayIdx * 24 * 60) + endMinsOfDay;

            return { key, startTotal, endTotal };
        }).filter(block => block !== null) as { key: string, startTotal: number, endTotal: number }[];

        const activeBlock = timeBlocks.find(b => currentTotalWeekMinutes >= b.startTotal && currentTotalWeekMinutes < b.endTotal);
        if (activeBlock) return activeBlock.key;

        const pastBlocks = timeBlocks.filter(b => b.endTotal <= currentTotalWeekMinutes);
        const futureBlocks = timeBlocks.filter(b => b.startTotal > currentTotalWeekMinutes);

        futureBlocks.sort((a, b) => a.startTotal - b.startTotal);
        const nextBlock = futureBlocks[0];

        if (!nextBlock) return null;

        pastBlocks.sort((a, b) => b.endTotal - a.endTotal);
        const lastFinishedBlock = pastBlocks[0];

        if (lastFinishedBlock) {
            const minutesSinceFinish = currentTotalWeekMinutes - lastFinishedBlock.endTotal;
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
        timeSlots,
        groupedLessons,
        currentDayName,
        activeOrNextGroupKey,
        getDisplayName,
        getGroupStyle
    };
}