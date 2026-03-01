<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import hw from '@/api/hwApi';
import InfoPop from '@/common/components/InfoModalCenter.vue';
import TabSwitcher from '@/common/components/TabSwitcher.vue';
import { useI18n } from 'vue-i18n';

const { t, tm } = useI18n();

// --- 1. Types & Interfaces ---

// Updated to match Supabase schema (persons + person_subjects payload)
interface DbPerson {
  id: string; // uuid
  name: string; // surname
  short: string; // abbreviation
  title: string;
  person_subjects?: { subjects: { name: string } }[];
}

interface Teacher {
  id: string;
  surname: string;
  abbreviation: string;
  title: string;
  subject1?: string;
  subject2?: string;
  subject3?: string;
  subject4?: string;
}

interface DbScheduleRow {
  id: string;
  room: string;
  size: number;
  mo_person_id: string | null;
  di_person_id: string | null;
  mi_person_id: string | null;
  do_person_id: string | null;
  fr_person_id: string | null;
}

interface ScheduleRow {
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

// Interface for the transformed Teacher Card data
interface TeacherScheduleCard {
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

// Union type for our computed property
type SearchResult = ScheduleRow | TeacherScheduleCard;

// --- 2. Data & Loading State ---
const teachers = ref<Teacher[]>([]);
const scheduleData = ref<ScheduleRow[]>([]);
const loading = ref(true);

const loadData = async () => {
    loading.value = true;
    try {
        const [personsRes, scheduleRes] = await Promise.all([
            hw.get<DbPerson[]>('/api/persons'),
            hw.get<DbScheduleRow[]>('/api/dalton_schedule')
        ]);
        
        // Transform Persons into Teachers format
        teachers.value = personsRes.data.map(p => {
           const subs = p.person_subjects?.map(ps => ps.subjects?.name).filter(Boolean) || [];
           return {
               id: p.id,
               surname: p.name,
               abbreviation: p.short,
               title: p.title || '',
               subject1: subs[0],
               subject2: subs[1],
               subject3: subs[2],
               subject4: subs[3],
           };
        });

        // Transform Dalton Schedules
        scheduleData.value = scheduleRes.data.map(r => ({
           room: r.room,
           size: r.size,
           schedule: {
               mo: r.mo_person_id,
               di: r.di_person_id,
               mi: r.mi_person_id,
               do: r.do_person_id,
               fr: r.fr_person_id
           }
        })).sort((a, b) => a.room.localeCompare(b.room));

    } catch (e) {
        console.error('Failed to load dalton planner data', e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadData();
});

// --- 3. Logic & Composition ---

const searchMode = ref<'room' | 'teacher'>('room');
const searchQuery = ref('');
const currentDay = new Date().getDay();

// TabSwitcher Items
const tabItems = [
  { id: 'room', label: t('school.tables.dalton.roomSearch') },
  { id: 'teacher', label: t('school.tables.dalton.teacherSearch') }
];

const handleTabChange = (id: string) => {
  searchMode.value = id as 'room' | 'teacher';
  searchQuery.value = ''; // Clear search when switching tabs
};

// Helper: Returns object instead of string for better styling control
const getTeacherDisplay = (id: string | null) => {
  if (!id) return { name: '-', subjects: '' };

  const teacher = teachers.value.find(item => item.id === id);
  if (!teacher) return { name: 'Unbekannt', subjects: '' };

  let titleKey = teacher.title;
  // Fallbacks if title is raw mr / ms instead of i18n key or if it's missing
  if (teacher.title === 'ms') titleKey = 'global.titles.abbr.ms';
  else if (teacher.title === 'mr') titleKey = 'global.titles.abbr.mr';

  const titleAbbr = titleKey ? t(titleKey) : '';
  const nameBase = titleAbbr ? `${titleAbbr} ${teacher.surname}` : teacher.surname;

  // Translate subjects if their global.subjects i18n key is used
  const rawSubs = [teacher.subject1, teacher.subject2, teacher.subject3, teacher.subject4].filter(s => s);
  const subs = rawSubs.map(s => {
      // Check if it's a global subject key, e.g. "global.subjects.math" vs "Mathematik"
      return t(s as string);
  }).join(', ');

  return {
    name: nameBase,
    subjects: subs
  };
};

// Computed property with simplified Types and better "Default" logic
const filteredResults = computed<SearchResult[]>(() => {
  const query = searchQuery.value.toLowerCase().trim();

    if (searchMode.value === 'room') {
    // FIX: If no query, return ALL rooms
    if (!query) return scheduleData.value;

    return scheduleData.value.filter(row =>
        row.room.toLowerCase().includes(query)
    );
  } else {
    // Mode: Teacher
    // If no query, we return empty list (too many teachers to show all by default)
    if (!query) return [];

    const matchedTeacherIds = teachers.value
        .filter(teacher => {
          let titleKey = teacher.title;
          if (teacher.title === 'ms') titleKey = 'global.titles.abbr.ms';
          else if (teacher.title === 'mr') titleKey = 'global.titles.abbr.mr';
          const titleAbbr = titleKey ? t(titleKey) : '';

          const fullSearchString = [
            titleAbbr,
            teacher.surname,
            teacher.abbreviation,
            teacher.subject1 ? t(teacher.subject1) : '',
            teacher.subject2 ? t(teacher.subject2) : '',
            teacher.subject3 ? t(teacher.subject3) : ''
          ].join(' ').toLowerCase();

          return fullSearchString.includes(query);
        })
        .map(teacher => teacher.id);

    if (matchedTeacherIds.length === 0) return [];

    const results: TeacherScheduleCard[] = [];

    matchedTeacherIds.forEach(id => {
      const teacherObj = teachers.value.find(teacher => teacher.id === id)!;
      let titleKey = teacherObj.title;
      if (teacherObj.title === 'ms') titleKey = 'global.titles.abbr.ms';
      else if (teacherObj.title === 'mr') titleKey = 'global.titles.abbr.mr';
      const titleAbbr = titleKey ? t(titleKey) : '';
      const nameBase = titleAbbr ? `${titleAbbr} ${teacherObj.surname}` : teacherObj.surname;

      const rawSubs = [teacherObj.subject1, teacherObj.subject2, teacherObj.subject3, teacherObj.subject4].filter(s => s);
      const subs = rawSubs.map(s => t(s as string)).join(', ');

      const teacherSchedule: TeacherScheduleCard = {
        teacherName: nameBase,
        teacherSubjects: subs,
        schedule: { mo: [], di: [], mi: [], do: [], fr: [] }
      };

      scheduleData.value.forEach(row => {
        const days = ['mo', 'di', 'mi', 'do', 'fr'] as const;
        days.forEach(day => {
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
</script>

<template>
  <div class="card">
    <div v-if="loading" class="flex align-center justify-center p-8">
       <span class="text-sub">Lade...</span>
    </div>
    <template v-else>
      <div class="flex align-center">
        <h2 style="margin-top: 0;" class="title-inf">
          {{ t('school.tables.dalton.title') }}
          <InfoPop
              :tooltip="t('school.tables.dalton.infopop.tooltip')"
              :title="t('school.tables.dalton.title')"
          >
            <h3 v-html="t('school.tables.dalton.infopop.description')"></h3>

            <template v-for="(section, index) in tm('school.tables.dalton.infopop.sections')" :key="index">
              <h3 v-html="section.title"></h3>
              <p v-html="section.text"></p>
            </template>
          </InfoPop>
        </h2>
      </div>

    <!-- TabSwitcher Navigation -->
    <div class="tab-navigation">
      <TabSwitcher
          :items="tabItems"
          :active-id="searchMode"
          @change="handleTabChange"
      />
    </div>

    <!-- Search Input -->
    <div class="search-input">
      <input
          v-model="searchQuery"
          type="text"
          :placeholder="searchMode === 'room' ? t('school.tables.dalton.searchRoom') : t('school.tables.dalton.searchTeacher')"
          class="input"
      />
    </div>

    <div class="results">
      <!-- Room Search Results -->
      <div v-if="searchMode === 'room'">
        <div v-if="filteredResults.length > 0">
          <div class="table-wrapper">
            <table>
              <thead>
              <tr>
                <th class="col-room">{{ t('school.tables.dalton.room') }}</th>
                <th :class="{ 'is-today': currentDay === 1 }">{{ t('global.weekdays.abbr.monday').toUpperCase() }}</th>
                <th :class="{ 'is-today': currentDay === 2 }">{{ t('global.weekdays.abbr.tuesday').toUpperCase() }}</th>
                <th :class="{ 'is-today': currentDay === 3 }">{{ t('global.weekdays.abbr.wednesday').toUpperCase() }}</th>
                <th :class="{ 'is-today': currentDay === 4 }">{{ t('global.weekdays.abbr.thursday').toUpperCase() }}</th>
                <th :class="{ 'is-today': currentDay === 5 }">{{ t('global.weekdays.abbr.friday').toUpperCase() }}</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(item, index) in (filteredResults as ScheduleRow[])" :key="index">
                <td class="room-cell"><strong>{{ item.room }}</strong></td>

                <td :class="{ 'is-today': currentDay === 1 }">
                  <div class="t-name" :class="{ 'is-today': currentDay === 1 }">{{ getTeacherDisplay(item.schedule.mo).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.mo).subjects" class="t-sub" :class="{ 'is-today': currentDay === 1 }">
                    {{ getTeacherDisplay(item.schedule.mo).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 2 }">
                  <div class="t-name" :class="{ 'is-today': currentDay === 2 }">{{ getTeacherDisplay(item.schedule.di).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.di).subjects" class="t-sub" :class="{ 'is-today': currentDay === 2 }">
                    {{ getTeacherDisplay(item.schedule.di).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 3 }">
                  <div class="t-name" :class="{ 'is-today': currentDay === 3 }">{{ getTeacherDisplay(item.schedule.mi).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.mi).subjects" class="t-sub" :class="{ 'is-today': currentDay === 3 }">
                    {{ getTeacherDisplay(item.schedule.mi).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 4 }">
                  <div class="t-name" :class="{ 'is-today': currentDay === 4 }">{{ getTeacherDisplay(item.schedule.do).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.do).subjects" class="t-sub" :class="{ 'is-today': currentDay === 4 }">
                    {{ getTeacherDisplay(item.schedule.do).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 5 }">
                  <div class="t-name" :class="{ 'is-today': currentDay === 5 }">{{ getTeacherDisplay(item.schedule.fr).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.fr).subjects" class="t-sub" :class="{ 'is-today': currentDay === 5 }">
                    {{ getTeacherDisplay(item.schedule.fr).subjects }}
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="no-results">{{ t('school.tables.dalton.noRoomFound') }}</div>
      </div>

      <!-- Teacher Search Results -->
      <div v-else-if="searchMode === 'teacher'">
        <div v-if="filteredResults.length > 0">
          <div v-for="(res, index) in (filteredResults as TeacherScheduleCard[])" :key="index" class="teacher-card">
            <div class="card-header">
              <h3>{{ res.teacherName }}</h3>
              <span class="subjects">{{ res.teacherSubjects }}</span>
            </div>
            <div class="teacher-grid">
              <div class="day-col" :class="{ 'is-today': currentDay === 1 }">
                <h4>MO</h4>
                <ul><li v-for="r in res.schedule.mo" :key="r">{{ r }}</li><li v-if="!res.schedule.mo.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 2 }">
                <h4>DI</h4>
                <ul><li v-for="r in res.schedule.di" :key="r">{{ r }}</li><li v-if="!res.schedule.di.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 3 }">
                <h4>MI</h4>
                <ul><li v-for="r in res.schedule.mi" :key="r">{{ r }}</li><li v-if="!res.schedule.mi.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 4 }">
                <h4>DO</h4>
                <ul><li v-for="r in res.schedule.do" :key="r">{{ r }}</li><li v-if="!res.schedule.do.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 5 }">
                <h4>FR</h4>
                <ul><li v-for="r in res.schedule.fr" :key="r">{{ r }}</li><li v-if="!res.schedule.fr.length" class="empty">-</li></ul>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="placeholder">
          {{ searchQuery ? t('school.tables.dalton.noTeacherFound') : t('school.tables.dalton.enterTeacherName') }}
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tab-navigation {
  width: 100%;
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  display: flex;
  justify-content: center;
}

.input {
  max-width: 400px;
  width: 100%;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: var(--border-4);
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
  background: transparent;
  min-width: 800px;
}

th {
  padding: 10px 12px;
  text-align: center;
  background: var(--vlbg);
  color: var(--text);
  font-weight: bold;
  border-top: 1px solid var(--border2);
  border-bottom: 1px solid var(--border2);
  border-right: 1px solid var(--border2);
}

th.is-today {
  background: var(--text);
  color: var(--bg);
}

th:first-child {
  border-left: 1px solid var(--border2);
  border-top-left-radius: var(--border-4);
  border-bottom-left-radius: var(--border-4);
}

th:last-child {
  border-top-right-radius: var(--border-4);
  border-bottom-right-radius: var(--border-4);
}

td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  background: var(--vlbg);
  border-top: 1px solid var(--border2);
  border-bottom: 1px solid var(--border2);
  border-right: 1px solid var(--border2);
  box-shadow: var(--input-shadow);
}

td.is-today {
  background-color: var(--text);
}

tr td:first-child {
  border-left: 1px solid var(--border2);
  border-top-left-radius: var(--border-4);
  border-bottom-left-radius: var(--border-4);
}

tr td:last-child {
  border-top-right-radius: var(--border-4);
  border-bottom-right-radius: var(--border-4);
}

.t-name {
  font-weight: 500;
  color: var(--text);
}

.t-name.is-today {
  color: var(--bg);
}

.t-sub {
  color: var(--sub);
  font-size: var(--font-size-sub);
  margin-top: 2px;
  line-height: 1.2;
  display: block;
}

.t-sub.is-today {
  color: var(--gg);
}

.room-cell {
  background: var(--vlbg);
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
}

/* TEACHER CARD STYLES */
.teacher-card {
  background: var(--vlbg);
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border2);
  border-radius: 16px;
  box-shadow: var(--input-shadow);
}

.card-header {
  margin-bottom: 8px;
}

.card-header h3 {
  font-size: var(--font-size-h3);
  line-height: 1;
  margin: 0 0 4px 0;
  color: var(--text);
}

.subjects {
  color: var(--sub);
  font-size: var(--font-size-body);
}

.teacher-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

@media (max-width: 360px) {
  .teacher-grid {
    grid-template-columns: 1fr;
  }

  .day-col {
    padding: 8px;
    border-bottom: 1px solid var(--border2);
    border-right: none !important;
  }

  .day-col:last-child {
    padding-bottom: 0 !important;
    border: none !important;
  }

  .day-col:first-child {
    padding-top: 0 !important;
    border-right: none !important;
  }
}

.day-col {
  padding: 8px;
  border-right: 1px solid var(--border2);
}

.day-col:last-child {
  border: none;
}

.day-col h4 {
  text-align: center;
  padding-bottom: 4px;
  color: var(--text);
  margin: 0;
  font-size: var(--font-size-body);
  font-family: var(--normal-font), sans-serif;
}

.day-col ul {
  padding: 0;
  list-style: none;
  margin: 0;
}

.day-col li {
  padding: 0;
  font-size: var(--font-size-body);
  text-align: center;
  color: var(--text);
}

.day-col li.empty {
  color: var(--sub);
}

.no-results, .placeholder {
  text-align: center;
  color: var(--sub);
  margin-top: 16px;
}
</style>