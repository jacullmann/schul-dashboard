import { ref, computed } from 'vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';

interface DbPerson {
  id: string; // uuid
  name: string; // surname
  short: string; // abbreviation
  title: string | null;
  personSubjects?: { subjects: { name: string } }[];
}

interface Teacher {
  id: string;
  surname: string;
  abbreviation: string;
  title: string | null;
  subjects: string[];
}

interface DbScheduleRow {
  id: string;
  room: string;
  size: number;
  moPersonId: string | null;
  diPersonId: string | null;
  miPersonId: string | null;
  doPersonId: string | null;
  frPersonId: string | null;
}

export interface ScheduleRow {
  room: string;
  size: number;
  schedule: {
    mo: string | null;
    di: string | null;
    mi: string | null;
    do: string | null;
    fr: string | null;
  };
}

export interface TeacherScheduleCard {
  teacherName: string;
  teacherSubjects: string;
  schedule: {
    mo: string[];
    di: string[];
    mi: string[];
    do: string[];
    fr: string[];
  };
}

export type SearchResult = ScheduleRow | TeacherScheduleCard;

export function useDaltonFinder() {
  const { t } = useI18n();

  const teachers = ref<Teacher[]>([]);
  const scheduleData = ref<ScheduleRow[]>([]);
  const loading = ref(true);

  const searchMode = ref<'room' | 'teacher'>('room');
  const searchQuery = ref('');

  const loadData = async () => {
    loading.value = true;
    try {
      const [personsRes, scheduleRes] = await Promise.all([
        hw.get<DbPerson[]>('/api/schedule/persons'),
        hw.get<DbScheduleRow[]>('/api/schedule/dalton-schedule'),
      ]);

      // Transform Persons into Teachers format
      teachers.value = personsRes.data.map((p) => {
        const subs =
          p.personSubjects?.map((ps) => ps.subjects?.name).filter(Boolean) ||
          [];
        return {
          id: p.id,
          surname: p.name,
          abbreviation: p.short,
          title: p.title,
          subjects: subs,
        };
      });

      // Transform Dalton Schedules
      scheduleData.value = scheduleRes.data
        .map((r) => ({
          room: r.room,
          size: r.size,
          schedule: {
            mo: r.moPersonId,
            di: r.diPersonId,
            mi: r.miPersonId,
            do: r.doPersonId,
            fr: r.frPersonId,
          },
        }))
        .sort((a, b) => a.room.localeCompare(b.room));
    } catch (e) {
      console.error('Failed to load dalton planner data', e);
    } finally {
      loading.value = false;
    }
  };

  const getTeacherDisplay = (id: string | null) => {
    if (!id) return { name: '-', subjects: '' };

    const teacher = teachers.value.find((item) => item.id === id);
    if (!teacher) return { name: 'Unbekannt', subjects: '' };

    let titleAbbr = '';
    // Fallbacks if title is raw mr / ms instead of i18n key or if it's missing
    if (teacher.title === 'ms') titleAbbr = t('global.titles.abbr.ms');
    else if (teacher.title === 'mr') titleAbbr = t('global.titles.abbr.mr');

    const nameBase = titleAbbr
      ? `${titleAbbr} ${teacher.surname}`
      : teacher.surname;

    // The subject name is the key for global.subjects
    const subs = teacher.subjects
      .map((s) => t(`global.subjects.${s}`))
      .join(', ');

    return {
      name: nameBase,
      subjects: subs,
    };
  };

  // Computed property with simplified Types and better "Default" logic
  const filteredResults = computed<SearchResult[]>(() => {
    const query = searchQuery.value.toLowerCase().trim();

    if (searchMode.value === 'room') {
      // FIX: If no query, return ALL rooms
      if (!query) return scheduleData.value;

      return scheduleData.value.filter((row) =>
        row.room.toLowerCase().includes(query),
      );
    } else {
      // Mode: Teacher
      // If no query, we return empty list (too many teachers to show all by default)
      if (!query) return [];

      const matchedTeacherIds = teachers.value
        .filter((teacher) => {
          let titleLabel = '';
          if (teacher.title === 'ms') titleLabel = t('global.titles.ms');
          else if (teacher.title === 'mr') titleLabel = t('global.titles.mr');

          const fullSearchString = [
            titleLabel,
            teacher.surname,
            teacher.abbreviation,
            ...teacher.subjects.map((s) => t(`global.subjects.${s}`)),
          ]
            .join(' ')
            .toLowerCase();

          return fullSearchString.includes(query);
        })
        .map((teacher) => teacher.id);

      if (matchedTeacherIds.length === 0) return [];

      const results: TeacherScheduleCard[] = [];

      matchedTeacherIds.forEach((id) => {
        const teacherObj = teachers.value.find((teacher) => teacher.id === id)!;
        let titleLabel = '';
        if (teacherObj.title === 'ms') titleLabel = t('global.titles.ms');
        else if (teacherObj.title === 'mr') titleLabel = t('global.titles.mr');

        const nameBase = titleLabel
          ? `${titleLabel} ${teacherObj.surname}`
          : teacherObj.surname;
        const subs = teacherObj.subjects
          .map((s) => t(`global.subjects.${s}`))
          .join(', ');

        const teacherSchedule: TeacherScheduleCard = {
          teacherName: nameBase,
          teacherSubjects: subs,
          schedule: { mo: [], di: [], mi: [], do: [], fr: [] },
        };

        scheduleData.value.forEach((row) => {
          const days = ['mo', 'di', 'mi', 'do', 'fr'] as const;
          days.forEach((day) => {
            if (row.schedule[day] === id) {
              teacherSchedule.schedule[day].push(row.room);
            }
          });
        });

        results.push(teacherSchedule);
      });

      return results;
    }
  });

  return {
    loading,
    searchMode,
    searchQuery,
    filteredResults,
    loadData,
    getTeacherDisplay,
  };
}
