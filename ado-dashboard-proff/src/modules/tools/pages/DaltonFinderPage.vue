<script setup lang="ts">
import { onMounted } from 'vue';
import InfoPop from '@/common/components/InfoModalCenter.vue';
import TabSwitcher from '@/common/components/TabSwitcher.vue';
import { useI18n } from 'vue-i18n';
import { useDaltonFinder } from '../composables/useDaltonFinder';
import type { ScheduleRow, TeacherScheduleCard } from '../composables/useDaltonFinder';

const { t, tm, locale } = useI18n();

const {
  loading,
  searchMode,
  searchQuery,
  filteredResults,
  loadData,
  getTeacherDisplay
} = useDaltonFinder();

const currentDay = new Date().getDay();

/**
 * Gets the 2-letter weekday name using Intl
 * @param day 1 (Mo) to 5 (Fr)
 */
const getDayName = (day: number) => {
  // January 1st, 2024 was a Monday
  const date = new Date(2024, 0, day);
  return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(date).slice(0, 2);
};

// TabSwitcher Items
const tabItems = [
  { id: 'room', label: t('school.tables.dalton.roomSearch') },
  { id: 'teacher', label: t('school.tables.dalton.teacherSearch') }
];

const handleTabChange = (id: string) => {
  searchMode.value = id as 'room' | 'teacher';
  searchQuery.value = ''; // Clear search when switching tabs
};

onMounted(() => {
  loadData();
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
                <th :class="{ 'is-today': currentDay === 1 }">{{ getDayName(1) }}</th>
                <th :class="{ 'is-today': currentDay === 2 }">{{ getDayName(2) }}</th>
                <th :class="{ 'is-today': currentDay === 3 }">{{ getDayName(3) }}</th>
                <th :class="{ 'is-today': currentDay === 4 }">{{ getDayName(4) }}</th>
                <th :class="{ 'is-today': currentDay === 5 }">{{ getDayName(5) }}</th>
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
                <h4>{{ getDayName(1) }}</h4>
                <ul><li v-for="r in res.schedule.mo" :key="r">{{ r }}</li><li v-if="!res.schedule.mo.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 2 }">
                <h4>{{ getDayName(2) }}</h4>
                <ul><li v-for="r in res.schedule.di" :key="r">{{ r }}</li><li v-if="!res.schedule.di.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 3 }">
                <h4>{{ getDayName(3) }}</h4>
                <ul><li v-for="r in res.schedule.mi" :key="r">{{ r }}</li><li v-if="!res.schedule.mi.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 4 }">
                <h4>{{ getDayName(4) }}</h4>
                <ul><li v-for="r in res.schedule.do" :key="r">{{ r }}</li><li v-if="!res.schedule.do.length" class="empty">-</li></ul>
              </div>
              <div class="day-col" :class="{ 'is-today': currentDay === 5 }">
                <h4>{{ getDayName(5) }}</h4>
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