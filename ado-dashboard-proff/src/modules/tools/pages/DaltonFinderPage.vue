<script setup lang="ts">
import { ref, computed } from 'vue';
import InfoPop from '@/common/components/InfoModalCenter.vue';
import TabSwitcher from '@/common/components/TabSwitcher.vue';
import { useI18n } from 'vue-i18n';

const { t, tm } = useI18n();

// --- 1. Types & Interfaces ---

interface Teacher {
  id: number;
  surname: string;
  abbreviation: string;
  title: string;
  subject1?: string;
  subject2?: string;
  subject3?: string;
  subject4?: string;
}

interface ScheduleRow {
  room: string;
  size: number;
  schedule: {
    mo: number | null;
    di: number | null;
    mi: number | null;
    do: number | null;
    fr: number | null;
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

// --- 2. Data (Kept exactly as you had them) ---
const teachers: Teacher[] = [
  { id: 1, surname: "Akdemir", abbreviation: "Ak", title: "ms", subject1: "Deutsch", subject2: "Kunst" },
  { id: 2, surname: "Austerfield", abbreviation: "Au", title: "mr", subject1: "Englisch", subject2: "Ethik", subject3: "Philosophie" },
  { id: 3, surname: "Bauer", abbreviation: "Br", title: "ms", subject1: "Religion", subject2: "Ethik" },
  { id: 4, surname: "Berg", abbreviation: "Bg", title: "mr", subject1: "Mathematik", subject2: "Sport" },
  { id: 5, surname: "Bies", abbreviation: "Bs", title: "mr", subject1: "Deutsch", subject2: "Latein" },
  { id: 6, surname: "Blanke", abbreviation: "Ba", title: "ms", subject1: "Biologie", subject2: "Englisch" },
  { id: 7, surname: "Borali", abbreviation: "Bor", title: "ms", subject1: "Chemie", subject2: "Informatik", subject3: "Mathematik" },
  { id: 8, surname: "Borchers", abbreviation: "Bo", title: "mr", subject1: "Sport" },
  { id: 9, surname: "Burkert", abbreviation: "Bu", title: "ms", subject1: "Englisch" },
  { id: 10, surname: "Burkhardt", abbreviation: "Bt", title: "ms", subject1: "Deutsch", subject2: "Politik" },
  { id: 11, surname: "Chahine", abbreviation: "Cn", title: "mr", subject1: "Englisch", subject2: "Politik" },
  { id: 12, surname: "Damde", abbreviation: "Dm", title: "ms", subject1: "Biologie", subject2: "Deutsch", subject3: "Ethik", subject4: "Philosophie" },
  { id: 13, surname: "Dias", abbreviation: "Da", title: "ms", subject1: "Geschichte", subject2: "Musik" },
  { id: 14, surname: "Dreyer", abbreviation: "Dy", title: "mr", subject1: "Theater", subject2: "Deutsch", subject3: "Französisch", subject4: "Kunst" },
  { id: 15, surname: "Drumm", abbreviation: "Dru", title: "ms", subject1: "Theater", subject2: "Englisch", subject3: "Geschichte", subject4: "Politik" },
  { id: 16, surname: "Eckers", abbreviation: "Ecs", title: "ms", subject1: "Biologie", subject2: "Deutsch" },
  { id: 17, surname: "Eckert", abbreviation: "Ec", title: "ms", subject1: "Englisch", subject2: "Physik" },
  { id: 18, surname: "Ellsiepen", abbreviation: "El", title: "ms", subject1: "Deutsch", subject2: "Musik" },
  { id: 19, surname: "Glier", abbreviation: "Gl", title: "ms", subject1: "Deutsch", subject2: "Französisch" },
  { id: 20, surname: "Haupt", abbreviation: "Ha", title: "ms", subject1: "Englisch", subject2: "Sport" },
  { id: 21, surname: "Herrmann", abbreviation: "Hr", title: "mr", subject1: "Informatik", subject2: "Mathematik", subject3: "Physik" },
  { id: 22, surname: "Keller", abbreviation: "Kel", title: "ms", subject1: "Englisch", subject2: "Geografie" },
  { id: 23, surname: "Kießling", abbreviation: "Ks", title: "ms", subject1: "Chemie", subject2: "Ethik", subject3: "Mathematik", subject4: "Philosophie" },
  { id: 24, surname: "Klein", abbreviation: "Ke", title: "ms", subject1: "Mathematik", subject2: "Musik" },
  { id: 25, surname: "Klose", abbreviation: "Kl", title: "ms", subject1: "Mathematik", subject2: "Physik" },
  { id: 26, surname: "Korte", abbreviation: "Kor", title: "ms", subject1: "Deutsch", subject2: "Latein" },
  { id: 27, surname: "Kröse", abbreviation: "Kr", title: "mr", subject1: "Englisch", subject2: "Ethik", subject3: "Philosophie" },
  { id: 28, surname: "Lee", abbreviation: "Le", title: "ms", subject1: "Deutsch", subject2: "Englisch" },
  { id: 29, surname: "Lillge", abbreviation: "Lg", title: "ms", subject1: "Englisch", subject2: "Geschichte", subject3: "Politik" },
  { id: 30, surname: "Luxen", abbreviation: "Lu", title: "mr", subject1: "Biologie", subject2: "Chemie" },
  { id: 31, surname: "Magnus", abbreviation: "Mg", title: "mr", subject1: "Theater", subject2: "Deutsch", subject3: "Geschichte", subject4: "Politik" },
  { id: 32, surname: "Matzies", abbreviation: "Mz", title: "ms", subject1: "Musik", subject2: "Politik" },
  { id: 33, surname: "Meister", abbreviation: "Mr", title: "mr", subject1: "Englisch", subject2: "Physik" },
  { id: 34, surname: "Moresmau", abbreviation: "Mo", title: "mr", subject1: "Französisch", subject2: "Politik" },
  { id: 35, surname: "Müller", abbreviation: "Mue", title: "ms", subject1: "Deutsch", subject2: "Französisch" },
  { id: 36, surname: "Müller", abbreviation: "Me", title: "mr", subject1: "Deutsch", subject2: "Ethik", subject3: "Philosophie" },
  { id: 37, surname: "Nagler", abbreviation: "Ng", title: "ms", subject1: "Englisch", subject2: "Kunst" },
  { id: 38, surname: "Nehse", abbreviation: "Nh", title: "ms", subject1: "Französisch", subject2: "Mathematik" },
  { id: 39, surname: "Nix", abbreviation: "Nx", title: "ms", subject1: "Geografie", subject2: "Mathematik" },
  { id: 40, surname: "Paasch", abbreviation: "Pa", title: "ms", subject1: "Deutsch", subject2: "Sport" },
  { id: 41, surname: "Paulus", abbreviation: "Ps", title: "ms", subject1: "Geografie", subject2: "Geschichte", subject3: "Politik" },
  { id: 42, surname: "Peukert", abbreviation: "Pt", title: "mr", subject1: "Geschichte", subject2: "Latein" },
  { id: 43, surname: "Preuß", abbreviation: "Pr", title: "mr", subject1: "Deutsch", subject2: "Ethik", subject3: "Geschichte" },
  { id: 44, surname: "Prey", abbreviation: "Py", title: "ms", subject1: "Mathematik", subject2: "Physik" },
  { id: 45, surname: "Rehlinghaus", abbreviation: "Rh", title: "ms", subject1: "Geschichte", subject2: "Mathematik", subject3: "Musik" },
  { id: 46, surname: "Rückert", abbreviation: "Rue", title: "mr", subject1: "Ethik", subject2: "Geschichte", subject3: "Politik" },
  { id: 47, surname: "Schalge", abbreviation: "Sg", title: "mr", subject1: "Chemie", subject2: "Geografie" },
  { id: 48, surname: "Schatz", abbreviation: "Saz", title: "mr", subject1: "Geschichte", subject2: "Politik", subject3: "Sport" },
  { id: 49, surname: "Schlüter", abbreviation: "Sü", title: "mr", subject1: "Geografie", subject2: "Geschichte", subject3: "Informatik" },
  { id: 50, surname: "Schmelzer", abbreviation: "Sz", title: "ms", subject1: "Biologie", subject2: "Chemie" },
  { id: 51, surname: "Schmid", abbreviation: "Sd", title: "ms", subject1: "Englisch", subject2: "Kunst" },
  { id: 52, surname: "Schmitt", abbreviation: "Sc", title: "ms", subject1: "Deutsch", subject2: "Geografie" },
  { id: 53, surname: "Schneider", abbreviation: "Ser", title: "ms", subject1: "Theater", subject2: "Englisch", subject3: "Kunst" },
  { id: 54, surname: "Scholler", abbreviation: "Sol", title: "ms", subject1: "Deutsch", subject2: "Englisch" },
  { id: 55, surname: "Schröter", abbreviation: "Shr", title: "mr", subject1: "Physik" },
  { id: 56, surname: "Sonnemann", abbreviation: "So", title: "ms", subject1: "Französisch", subject2: "Latein" },
  { id: 57, surname: "Stilo", abbreviation: "St", title: "ms", subject1: "Französisch", subject2: "Musik" },
  { id: 58, surname: "Stöhr", abbreviation: "Sr", title: "mr", subject1: "Biologie", subject2: "Geografie" },
  { id: 59, surname: "Tarakci", abbreviation: "Ta", title: "ms", subject1: "Ethik", subject2: "Philosophie", subject3: "Politik" },
  { id: 60, surname: "Thamm", abbreviation: "Tm", title: "ms", subject1: "Biologie", subject2: "Chemie" },
  { id: 61, surname: "Türhan", abbreviation: "Tn", title: "ms", subject1: "Mathematik", subject2: "Physik" },
  { id: 62, surname: "Ucaroglu", abbreviation: "Uc", title: "ms", subject1: "Englisch", subject2: "Geschichte", subject3: "Politik" },
  { id: 63, surname: "von Wangenheim", abbreviation: "Wh", title: "ms", subject1: "Französisch", subject2: "Mathematik" },
  { id: 64, surname: "Weber", abbreviation: "We", title: "mr", subject1: "Biologie", subject2: "Physik" },
  { id: 65, surname: "Wolf", abbreviation: "WL", title: "ms", subject1: "Deutsch", subject2: "Englisch" },
  { id: 66, surname: "Yatkin", abbreviation: "Ya", title: "ms", subject1: "Französisch", subject2: "Sport" },
  { id: 67, surname: "Zimmermann", abbreviation: "Zm", title: "mr", subject1: "Geografie", subject2: "Sport" }
];

const scheduleData: ScheduleRow[] = [
  { "room": "A-109", "size": 20, "schedule": { "mo": 1, "di": 1, "mi": 1, "do": 37, "fr": 53 } },
  { "room": "A-115", "size": 20, "schedule": { "mo": 49, "di": null, "mi": 49, "do": 49, "fr": null } },
  { "room": "A003", "size": 27, "schedule": { "mo": null, "di": 15, "mi": 65, "do": 64, "fr": 27 } },
  { "room": "A004", "size": 27, "schedule": { "mo": 47, "di": 9, "mi": 15, "do": 31, "fr": 20 } },
  { "room": "A005", "size": 27, "schedule": { "mo": 36, "di": 10, "mi": 10, "do": 26, "fr": 66 } },
  { "room": "A007", "size": 27, "schedule": { "mo": 29, "di": 60, "mi": 6, "do": 30, "fr": 60 } },
  { "room": "A008", "size": 27, "schedule": { "mo": 59, "di": 33, "mi": 36, "do": 27, "fr": 9 } },
  { "room": "A009", "size": 27, "schedule": { "mo": 56, "di": 65, "mi": 16, "do": 9, "fr": 63 } },
  { "room": "A104", "size": 27, "schedule": { "mo": 17, "di": 55, "mi": 3, "do": 33, "fr": 46 } },
  { "room": "A106", "size": 25, "schedule": { "mo": 44, "di": 25, "mi": 60, "do": 58, "fr": 44 } },
  { "room": "A108", "size": 25, "schedule": { "mo": 12, "di": 23, "mi": 46, "do": 47, "fr": 7 } },
  { "room": "A110", "size": 27, "schedule": { "mo": 60, "di": 43, "mi": 42, "do": 23, "fr": 50 } },
  { "room": "A111", "size": 27, "schedule": { "mo": 25, "di": 61, "mi": 27, "do": 46, "fr": 38 } },
  { "room": "A202", "size": 27, "schedule": { "mo": 35, "di": 51, "mi": 9, "do": 56, "fr": 56 } },
  { "room": "A203", "size": 27, "schedule": { "mo": 58, "di": 64, "mi": 58, "do": 12, "fr": 12 } },
  { "room": "A204", "size": 27, "schedule": { "mo": null, "di": 16, "mi": 40, "do": 5, "fr": 62 } },
  { "room": "A206", "size": 25, "schedule": { "mo": 7, "di": 17, "mi": 2, "do": 11, "fr": 2 } },
  { "room": "A207", "size": 25, "schedule": { "mo": 16, "di": 58, "mi": 12, "do": 15, "fr": 14 } },
  { "room": "A210", "size": 27, "schedule": { "mo": 48, "di": 14, "mi": 37, "do": 53, "fr": 1 } },
  { "room": "A301", "size": 27, "schedule": { "mo": 18, "di": 18, "mi": 35, "do": null, "fr": 48 } },
  { "room": "A303", "size": 27, "schedule": { "mo": 67, "di": 3, "mi": 67, "do": 41, "fr": 41 } },
  { "room": "A305", "size": 24, "schedule": { "mo": 54, "di": 31, "mi": 43, "do": 48, "fr": 42 } },
  { "room": "A306", "size": 24, "schedule": { "mo": null, "di": 62, "mi": 11, "do": null, "fr": 34 } },
  { "room": "A307", "size": 22, "schedule": { "mo": 5, "di": 28, "mi": null, "do": 59, "fr": 28 } },
  { "room": "A309", "size": 15, "schedule": { "mo": 45, "di": 45, "mi": 44, "do": 45, "fr": 43 } },
  { "room": "A310", "size": 22, "schedule": { "mo": 24, "di": 63, "mi": 63, "do": 63, "fr": 39 } },
  { "room": "A311", "size": 22, "schedule": { "mo": 34, "di": 34, "mi": 28, "do": 35, "fr": 19 } },
  { "room": "A312", "size": 24, "schedule": { "mo": 64, "di": 54, "mi": 7, "do": 7, "fr": 54 } },
  { "room": "B204", "size": 12, "schedule": { "mo": null, "di": null, "mi": null, "do": null, "fr": 40 } }
];

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
const getTeacherDisplay = (id: number | null) => {
  if (!id) return { name: '-', subjects: '' };

  const teacher = teachers.find(item => item.id === id);
  if (!teacher) return { name: 'Unbekannt', subjects: '' };

  const titleKey = teacher.title === 'ms' ? 'global.titles.abbr.ms' : 'global.titles.abbr.mr';
  const titleAbbr = t(titleKey); // Fixed: Removed quotes so it uses the variable
  const subs = [teacher.subject1, teacher.subject2, teacher.subject3, teacher.subject4].filter(s => s).join(', ');

  return {
    name: `${titleAbbr} ${teacher.surname}`,
    subjects: subs
  };
};

// Computed property with simplified Types and better "Default" logic
const filteredResults = computed<SearchResult[]>(() => {
  const query = searchQuery.value.toLowerCase().trim();

  if (searchMode.value === 'room') {
    // FIX: If no query, return ALL rooms
    if (!query) return scheduleData;

    return scheduleData.filter(row =>
        row.room.toLowerCase().includes(query)
    );
  } else {
    // Mode: Teacher
    // If no query, we return empty list (too many teachers to show all by default)
    if (!query) return [];

    const matchedTeacherIds = teachers
        .filter(teacher => {
          const fullSearchString = [
            teacher.title,
            teacher.surname,
            teacher.abbreviation,
            teacher.subject1,
            teacher.subject2,
            teacher.subject3
          ].join(' ').toLowerCase();

          return fullSearchString.includes(query);
        })
        .map(teacher => teacher.id);

    if (matchedTeacherIds.length === 0) return [];

    const results: TeacherScheduleCard[] = [];

    matchedTeacherIds.forEach(id => {
      // Renamed 't' to 'teacherObj' to avoid conflict with i18n 't'
      const teacherObj = teachers.find(teacher => teacher.id === id)!;
      const subs = [teacherObj.subject1, teacherObj.subject2, teacherObj.subject3, teacherObj.subject4].filter(s => s).join(', ');

      const teacherSchedule: TeacherScheduleCard = {
        teacherName: `${teacherObj.title} ${teacherObj.surname}`,
        teacherSubjects: subs,
        schedule: { mo: [], di: [], mi: [], do: [], fr: [] }
      };

      let hasEntries = false;

      scheduleData.forEach(row => {
        const days = ['mo', 'di', 'mi', 'do', 'fr'] as const;
        days.forEach(day => {
          if (row.schedule[day] === id) {
            hasEntries = true;
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
    <div class="flex align-center">
      <h2 style="margin-top: 0;"
          class="title-inf"
      >
        {{ t('school.tables.dalton.title') }}
        <InfoPop
            :tooltip="t('school.tables.dalton.infopop.tooltip')"
            :title="t('school.tables.dalton.title')"
        >
          <h3>{{ t('school.tables.dalton.infopop.description') }}</h3>

          <template v-for="(section, index) in tm('school.tables.dalton.infopop.sections')" :key="index">
            <h3>{{ t('school.tables.dalton.infopop.sections.title') }}</h3>
            <p>{{ t('school.tables.dalton.infopop.sections.text') }}</p>
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