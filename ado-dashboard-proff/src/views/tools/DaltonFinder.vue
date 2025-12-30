
<script setup lang="ts">
import { ref, computed } from 'vue';
import InfoPop from '../../components/info/InfoModalCenter.vue';
import TabSwitcher from '../../components/TabSwitcher.vue';

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
  { id: 1, surname: "Akdemir", abbreviation: "Ak", title: "Frau", subject1: "Deutsch", subject2: "Kunst" },
  { id: 3, surname: "Austerfield", abbreviation: "Au", title: "Herr", subject1: "Englisch", subject2: "Ethik", subject3: "Philosophie" },
  { id: 77, surname: "Bauer", abbreviation: "Br", title: "Frau", subject1: "Religion", subject2: "Ethik" },
  { id: 5, surname: "Benzin", abbreviation: "Bz", title: "Herr", subject1: "Geschichte", subject2: "Sport" },
  { id: 6, surname: "Berg", abbreviation: "Bg", title: "Herr", subject1: "Mathematik", subject2: "Sport" },
  { id: 8, surname: "Bies", abbreviation: "Bs", title: "Herr", subject1: "Deutsch", subject2: "Latein" },
  { id: 9, surname: "Blanke", abbreviation: "Ba", title: "Frau", subject1: "Biologie", subject2: "Englisch" },
  { id: 10, surname: "Borali", abbreviation: "Bor", title: "Frau", subject1: "Chemie", subject2: "Informatik", subject3: "Mathematik" },
  { id: 78, surname: "Borchers", abbreviation: "Bo", title: "Herr", subject1: "Sport" },
  { id: 11, surname: "Burkert", abbreviation: "Bu", title: "Frau", subject1: "Englisch" },
  { id: 12, surname: "Burkhardt", abbreviation: "Bt", title: "Frau", subject1: "Deutsch", subject2: "Politik" },
  { id: 13, surname: "Chahine", abbreviation: "Cn", title: "Herr", subject1: "Englisch", subject2: "Politik" },
  { id: 14, surname: "Damde", abbreviation: "Dm", title: "Frau", subject1: "Biologie", subject2: "Deutsch", subject3: "Ethik", subject4: "Philosophie" },
  { id: 16, surname: "Dias", abbreviation: "Da", title: "Frau", subject1: "Geschichte", subject2: "Musik" },
  { id: 17, surname: "Dreyer", abbreviation: "Dy", title: "Herr", subject1: "Theater", subject2: "Deutsch", subject3: "Französisch", subject4: "Kunst" },
  { id: 18, surname: "Drumm", abbreviation: "Dru", title: "Frau", subject1: "Theater", subject2: "Englisch", subject3: "Geschichte", subject4: "Politik" },
  { id: 20, surname: "Eckers", abbreviation: "Ecs", title: "Frau", subject1: "Biologie", subject2: "Deutsch" },
  { id: 21, surname: "Eckert", abbreviation: "Ec", title: "Frau", subject1: "Englisch", subject2: "Physik" },
  { id: 22, surname: "Ellsiepen", abbreviation: "El", title: "Frau", subject1: "Deutsch", subject2: "Musik" },
  { id: 23, surname: "Glier", abbreviation: "Gl", title: "Frau", subject1: "Deutsch", subject2: "Französisch" },
  { id: 73, surname: "Haupt", abbreviation: "Ha", title: "Frau", subject1: "Englisch", subject2: "Sport" },
  { id: 24, surname: "Herrmann", abbreviation: "Hr", title: "Herr", subject1: "Informatik", subject2: "Mathematik", subject3: "Physik" },
  { id: 25, surname: "Keller", abbreviation: "Kel", title: "Frau", subject1: "Englisch", subject2: "Geografie" },
  { id: 26, surname: "Kießling", abbreviation: "Ks", title: "Frau", subject1: "Chemie", subject2: "Ethik", subject3: "Mathematik", subject4: "Philosophie" },
  { id: 28, surname: "Klein", abbreviation: "Ke", title: "Frau", subject1: "Mathematik", subject2: "Musik" },
  { id: 29, surname: "Klose", abbreviation: "Kl", title: "Frau", subject1: "Mathematik", subject2: "Physik" },
  { id: 30, surname: "Korte", abbreviation: "Kor", title: "Frau", subject1: "Deutsch", subject2: "Latein" },
  { id: 31, surname: "Kröse", abbreviation: "Kr", title: "Herr", subject1: "Englisch", subject2: "Ethik", subject3: "Philosophie" },
  { id: 32, surname: "Lee", abbreviation: "Le", title: "Frau", subject1: "Deutsch", subject2: "Englisch" },
  { id: 33, surname: "Lillge", abbreviation: "Lg", title: "Frau", subject1: "Englisch", subject2: "Geschichte", subject3: "Politik" },
  { id: 36, surname: "Luxen", abbreviation: "Lu", title: "Herr", subject1: "Biologie", subject2: "Chemie" },
  { id: 37, surname: "Magnus", abbreviation: "Mg", title: "Herr", subject1: "Theater", subject2: "Deutsch", subject3: "Geschichte", subject4: "Politik" },
  { id: 38, surname: "Matzies", abbreviation: "Mz", title: "Frau", subject1: "Musik", subject2: "Politik" },
  { id: 39, surname: "Meister", abbreviation: "Mr", title: "Herr", subject1: "Englisch", subject2: "Physik" },
  { id: 40, surname: "Moresmau", abbreviation: "Mo", title: "Herr", subject1: "Französisch", subject2: "Politik" },
  { id: 41, surname: "Müller", abbreviation: "Mue", title: "Frau", subject1: "Deutsch", subject2: "Französisch" },
  { id: 42, surname: "Müller", abbreviation: "Me", title: "Herr", subject1: "Deutsch", subject2: "Ethik", subject3: "Philosophie" },
  { id: 43, surname: "Nagler", abbreviation: "Ng", title: "Frau", subject1: "Englisch", subject2: "Kunst" },
  { id: 45, surname: "Nehse", abbreviation: "Nh", title: "Frau", subject1: "Französisch", subject2: "Mathematik" },
  { id: 46, surname: "Nix", abbreviation: "Nx", title: "Frau", subject1: "Geografie", subject2: "Mathematik" },
  { id: 74, surname: "Nobiling", abbreviation: "Nob", title: "Herr", subject1: "Mathematik", subject2: "Physik" },
  { id: 47, surname: "Paasch", abbreviation: "Pa", title: "Frau", subject1: "Deutsch", subject2: "Sport" },
  { id: 48, surname: "Paulus", abbreviation: "Ps", title: "Frau", subject1: "Geografie", subject2: "Geschichte", subject3: "Politik" },
  { id: 49, surname: "Peukert", abbreviation: "Pt", title: "Herr", subject1: "Geschichte", subject2: "Latein" },
  { id: 50, surname: "Preuß", abbreviation: "Pr", title: "Herr", subject1: "Deutsch", subject2: "Ethik", subject3: "Geschichte" },
  { id: 51, surname: "Prey", abbreviation: "Py", title: "Frau", subject1: "Mathematik", subject2: "Physik" },
  { id: 52, surname: "Rehlinghaus", abbreviation: "Rh", title: "Frau", subject1: "Geschichte", subject2: "Mathematik", subject3: "Musik" },
  { id: 75, surname: "Rückert", abbreviation: "Rue", title: "Herr", subject1: "Ethik", subject2: "Geschichte", subject3: "Politik" },
  { id: 54, surname: "Schalge", abbreviation: "Sg", title: "Herr", subject1: "Chemie", subject2: "Geografie" },
  { id: 56, surname: "Schlüter", abbreviation: "Sü", title: "Herr", subject1: "Geografie", subject2: "Geschichte", subject3: "Informatik" },
  { id: 57, surname: "Schmelzer", abbreviation: "Sz", title: "Frau", subject1: "Biologie", subject2: "Chemie" },
  { id: 58, surname: "Schmid", abbreviation: "Sd", title: "Frau", subject1: "Englisch", subject2: "Kunst" },
  { id: 59, surname: "Schmitt", abbreviation: "Sc", title: "Frau", subject1: "Deutsch", subject2: "Geografie" },
  { id: 60, surname: "Schneider", abbreviation: "Ser", title: "Frau", subject1: "Theater", subject2: "Englisch", subject3: "Kunst" },
  { id: 61, surname: "Scholler", abbreviation: "Sol", title: "Frau", subject1: "Deutsch", subject2: "Englisch" },
  { id: 62, surname: "Sonnemann", abbreviation: "So", title: "Frau", subject1: "Französisch", subject2: "Latein" },
  { id: 63, surname: "Stilo", abbreviation: "St", title: "Frau", subject1: "Französisch", subject2: "Musik" },
  { id: 64, surname: "Stöhr", abbreviation: "Sr", title: "Herr", subject1: "Biologie", subject2: "Geografie" },
  { id: 65, surname: "Thamm", abbreviation: "Tm", title: "Frau", subject1: "Biologie", subject2: "Chemie" },
  { id: 66, surname: "Türhan", abbreviation: "Tn", title: "Frau", subject1: "Mathematik", subject2: "Physik" },
  { id: 67, surname: "Ucaroglu", abbreviation: "Uc", title: "Frau", subject1: "Englisch", subject2: "Geschichte", subject3: "Politik" },
  { id: 68, surname: "von Wangenheim", abbreviation: "Wh", title: "Frau", subject1: "Französisch", subject2: "Mathematik" },
  { id: 70, surname: "Weber", abbreviation: "We", title: "Herr", subject1: "Biologie", subject2: "Physik" },
  { id: 76, surname: "Wolf", abbreviation: "WL", title: "Frau", subject1: "Deutsch", subject2: "Englisch" },
  { id: 71, surname: "Yatkin", abbreviation: "Ya", title: "Frau", subject1: "Französisch", subject2: "Sport" },
  { id: 72, surname: "Zimmermann", abbreviation: "Zm", title: "Herr", subject1: "Geografie", subject2: "Sport" }
];

const scheduleData: ScheduleRow[] = [
  { room: "A-109", schedule: { mo: 54, di: 1, mi: 43, do: 1, fr: 60 } },
  { room: "A-115", schedule: { mo: 56, di: null, mi: 56, do: 70, fr: null } },
  { room: "A003", schedule: { mo: 76, di: 18, mi: 13, do: 56, fr: 20 } },
  { room: "A004", schedule: { mo: 5, di: 11, mi: 18, do: 37, fr: 41 } },
  { room: "A005", schedule: { mo: 42, di: 12, mi: 12, do: 30, fr: 71 } },
  { room: "A007", schedule: { mo: 33, di: 5, mi: 5, do: 43, fr: 31 } },
  { room: "A008", schedule: { mo: 70, di: 39, mi: 42, do: 31, fr: 11 } },
  { room: "A009", schedule: { mo: 62, di: 17, mi: 50, do: 11, fr: 68 } },
  { room: "A104", schedule: { mo: 21, di: 74, mi: 77, do: 39, fr: 75 } },
  { room: "A106", schedule: { mo: 51, di: 29, mi: 29, do: 29, fr: 51 } },
  { room: "A108", schedule: { mo: 26, di: 26, mi: 75, do: 54, fr: 61 } },
  { room: "A110", schedule: { mo: 65, di: 36, mi: 49, do: 36, fr: 57 } },
  { room: "A111", schedule: { mo: 29, di: 20, mi: 10, do: 66, fr: 45 } },
  { room: "A202", schedule: { mo: 41, di: 61, mi: 11, do: 62, fr: 62 } },
  { room: "A203", schedule: { mo: 64, di: 70, mi: 64, do: 14, fr: 14 } },
  { room: "A204", schedule: { mo: 28, di: 75, mi: 47, do: 8, fr: 67 } },
  { room: "A206", schedule: { mo: 10, di: 21, mi: 3, do: 13, fr: 3 } },
  { room: "A207", schedule: { mo: 14, di: 9, mi: 14, do: 20, fr: 9 } },
  { room: "A210", schedule: { mo: 73, di: 64, mi: 1, do: 60, fr: 17 } },
  { room: "A301", schedule: { mo: 22, di: 22, mi: null, do: 52, fr: 73 } },
  { room: "A303", schedule: { mo: 72, di: 77, mi: 72, do: 48, fr: 48 } },
  { room: "A305", schedule: { mo: 61, di: 48, mi: null, do: 16, fr: 10 } },
  { room: "A306", schedule: { mo: 67, di: 76, mi: 64, do: 40, fr: 76 } },
  { room: "A307", schedule: { mo: 8, di: 32, mi: null, do: 23, fr: 32 } },
  { room: "A309", schedule: { mo: 52, di: 52, mi: 51, do: 50, fr: 50 } },
  { room: "A310", schedule: { mo: 66, di: 68, mi: 68, do: 68, fr: 46 } },
  { room: "A311", schedule: { mo: 40, di: 40, mi: null, do: 41, fr: 23 } },
  { room: "A312", schedule: { mo: null, di: 58, mi: 67, do: 10, fr: 49 } },
];

// --- 3. Logic & Composition ---

const searchMode = ref<'room' | 'teacher'>('room');
const searchQuery = ref('');
const currentDay = new Date().getDay();

// TabSwitcher Items
const tabItems = [
  { id: 'room', label: 'Raumsuche' },
  { id: 'teacher', label: 'Lehrer*innensuche' }
];

const handleTabChange = (id: string) => {
  searchMode.value = id as 'room' | 'teacher';
  searchQuery.value = ''; // Clear search when switching tabs
};

// Helper: Returns object instead of string for better styling control
const getTeacherDisplay = (id: number | null) => {
  if (!id) return { name: '-', subjects: '' };

  const t = teachers.find(teacher => teacher.id === id);
  if (!t) return { name: 'Unbekannt', subjects: '' };

  const titleAbbr = t.title === 'Frau' ? 'Fr.' : 'Hr.';
  // Join subjects with a comma, no parentheses
  const subs = [t.subject1, t.subject2, t.subject3, t.subject4].filter(s => s).join(', ');

  return {
    name: `${titleAbbr} ${t.surname}`,
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
        .filter(t => {
          const fullSearchString = [
            t.title,
            t.surname,
            t.abbreviation,
            t.subject1,
            t.subject2,
            t.subject3
          ].join(' ').toLowerCase();

          return fullSearchString.includes(query);
        })
        .map(t => t.id);

    if (matchedTeacherIds.length === 0) return [];

    const results: TeacherScheduleCard[] = [];

    matchedTeacherIds.forEach(id => {
      const t = teachers.find(teacher => teacher.id === id)!;
      const subs = [t.subject1, t.subject2, t.subject3, t.subject4].filter(s => s).join(', ');

      const teacherSchedule: TeacherScheduleCard = {
        teacherName: `${t.title} ${t.surname}`,
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
        Daltonraumfinder
        <InfoPop
            tooltip="Daltonraumfinder Info"
            title="Daltonraumfinder"
        >
          <p>Finde den passenden Raum in wenigen Sekunden.</p>

          <h3>Raumsuche</h3>
          <p>Sieh für jeden Raum, an welchem Tag welcher Lehrer hier ist.</p>

          <h3>Lehrersuche</h3>
          <p>Suche nach bestimmten Lehrern und lasse dir anzeigen, wann sie in welchen Räumen sind oder gib ein Fach ein, für das du Hilfe brauchst, und finde jeden zugehörigen Fachlehrer und die Räume, die sie belegen.</p>
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
          :placeholder="searchMode === 'room' ? 'Raum suchen...' : 'Lehrer suchen...'"
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
                <th class="col-room">Raum</th>
                <th :class="{ 'is-today': currentDay === 1 }">MO</th>
                <th :class="{ 'is-today': currentDay === 2 }">DI</th>
                <th :class="{ 'is-today': currentDay === 3 }">MI</th>
                <th :class="{ 'is-today': currentDay === 4 }">DO</th>
                <th :class="{ 'is-today': currentDay === 5 }">FR</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(item, index) in (filteredResults as ScheduleRow[])" :key="index">
                <td class="room-cell"><strong>{{ item.room }}</strong></td>

                <td :class="{ 'is-today': currentDay === 1 }">
                  <div class="t-name">{{ getTeacherDisplay(item.schedule.mo).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.mo).subjects" class="t-sub">
                    {{ getTeacherDisplay(item.schedule.mo).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 2 }">
                  <div class="t-name">{{ getTeacherDisplay(item.schedule.di).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.di).subjects" class="t-sub">
                    {{ getTeacherDisplay(item.schedule.di).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 3 }">
                  <div class="t-name">{{ getTeacherDisplay(item.schedule.mi).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.mi).subjects" class="t-sub">
                    {{ getTeacherDisplay(item.schedule.mi).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 4 }">
                  <div class="t-name">{{ getTeacherDisplay(item.schedule.do).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.do).subjects" class="t-sub">
                    {{ getTeacherDisplay(item.schedule.do).subjects }}
                  </div>
                </td>

                <td :class="{ 'is-today': currentDay === 5 }">
                  <div class="t-name">{{ getTeacherDisplay(item.schedule.fr).name }}</div>
                  <div v-if="getTeacherDisplay(item.schedule.fr).subjects" class="t-sub">
                    {{ getTeacherDisplay(item.schedule.fr).subjects }}
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="no-results">Keine Räume gefunden.</div>
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
          {{ searchQuery ? 'Keine Lehrer gefunden.' : 'Bitte Lehrername eingeben.' }}
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

th:first-child {
  border-left: 1px solid var(--border2);
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

th:last-child {
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  background: var(--vlbg);
  border-top: 1px solid var(--border2);
  border-bottom: 1px solid var(--border2);
  border-right: 1px solid var(--border2);
}

tr td:first-child {
  border-left: 1px solid var(--border2);
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

tr td:last-child {
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

.t-name {
  font-weight: 500;
  color: var(--text);
}

.t-sub {
  color: var(--sub);
  font-size: 14px;
  margin-top: 2px;
  line-height: 1.2;
  display: block;
}

.room-cell {
  background: var(--vlbg);
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
}

.is-today {
  background-color: var(--gg);
}

/* TEACHER CARD STYLES */
.teacher-card {
  background: var(--vlbg);
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border2);
  border-radius: 16px;
}

.card-header {
  margin-bottom: 8px;
}

.card-header h3 {
  margin: 0 0 4px 0;
  color: var(--text);
}

.subjects {
  color: var(--sub);
  font-size: 0.95em;
}

.teacher-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

@media (max-width: 360px) {
  .teacher-grid { grid-template-columns: 1fr; }
}

.day-col {
  background: var(--gg);
  padding: 4px 8px;
  border-radius: 8px;
}

.day-col h4 {
  text-align: center;
  padding-bottom: 5px;
  color: var(--text);
  margin: 0;
}

.day-col ul {
  padding: 0;
  list-style: none;
  margin: 0;
}

.day-col li {
  padding: 0;
  font-size: 0.9em;
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