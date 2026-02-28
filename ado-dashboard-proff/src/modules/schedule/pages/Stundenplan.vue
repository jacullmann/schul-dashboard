<script setup lang="ts">
import InfoPop from '@/common/components/InfoModalCenter.vue'
import { useTimetable } from '@/modules/schedule/composables/useTimetable';
import { useI18n } from 'vue-i18n';

const { t, tm } = useI18n();
const {
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
} = useTimetable();
</script>

<template>
  <div class="card">
    <div>
      <h2 style="margin-top: 0" class="title-inf">
        {{ t('school.tables.timetable.title') }}
        <InfoPop
            :tooltip="t('school.tables.timetable.infopop.tooltip')"
            :title="t('school.tables.timetable.title')">

          <h3>{{ t('school.tables.timetable.infopop.description') }}</h3>
          <div v-for="(section, index) in tm('school.tables.timetable.infopop.sections')" :key="index">
            <h3>{{ section.title }}</h3>
            <p>{{ section.text }}</p>
          </div>
          <div class="info-img-container">
            <img alt="Bild" src="https://res.cloudinary.com/dwysdpvcm/image/upload/v1765474359/Stundenplan_Ausfall_Grafik_b34pcq.webp" class="info-img"/>
          </div>


        </InfoPop>
      </h2>
      <div class="status-row">
        <div v-if="loadingSubs || loadingLessons" class="small">{{ t('school.tables.timetable.loading') }}</div>
        <div v-else-if="isPersonalized" class="personalized-badge">
          {{ t('school.tables.timetable.personalized') }}
        </div>
      </div>
    </div>
    <div class="timetable-grid">

      <div class="header-cell time-header">{{ t('school.tables.timetable.lesson') }}</div>
      <div
          v-for="day in days"
          :key="day"
          class="header-cell day-header"
          :class="{'current-day-header': day === currentDayName}"
      >
        {{ day }}
      </div>

      <div
          v-for="ts in timeSlots"
          :key="ts.slot"
          class="time-slot-label"
          :style="{ gridRow: ts.slot + 1 }"
      >
        <span class="slot-number">{{ ts.slot }}</span>
        <span class="slot-time">{{ ts.time }}</span>
      </div>

      <div
          v-for="(group, key) in groupedLessons"
          :key="key"
          class="lesson-group-container"
          :class="{
            'highlight-active': key === activeOrNextGroupKey,
            'current-day': group[0].day === currentDayName
            }"
          :style="getGroupStyle(group)"
      >
        <div
            v-for="(lesson, index) in group"
            :key="index"
            class="sub-lesson-item"
            :class="{
              'has-border': index < group.length - 1,
            }"
        >
          <div v-if="lesson.cancelled">
            <div class="lesson-subject crossed">{{ getDisplayName(lesson) }}</div>
            <div class="ausfall-label">{{ t('school.tables.timetable.cancelled') }}</div>
            <div class="lesson-details">
              <span class="crossed">{{ lesson.room }}</span>
              <span class="crossed">{{ lesson.teacher }}</span>
            </div>
          </div>

          <div v-else>
            <div class="lesson-subject">
              <span v-if="lesson.subject !== lesson._original?.subject" class="crossed">
                {{ getDisplayName(lesson._original!) }}
                <!---{{ lesson._original?.subject_abbr || getDisplayName(lesson._original!) }}--->
              </span>
              <span :class="{ 'new-val': lesson.subject !== lesson._original?.subject }">
                {{ getDisplayName(lesson) }}
              </span>
            </div>

            <div class="lesson-details">
              <span class="detail-group">
                <span v-if="lesson.room !== lesson._original?.room" class="crossed">
                   {{ lesson._original?.room }}
                </span>
                <span :class="{ 'new-val': lesson.room !== lesson._original?.room }">
                   {{ lesson.room }}
                </span>
              </span>

              <span class="detail-group">
                <span v-if="lesson.teacher !== lesson._original?.teacher" class="crossed">
                   {{ lesson._original?.teacher }}
                </span>
                <span :class="{ 'new-val': lesson.teacher !== lesson._original?.teacher }">
                  {{ lesson.teacher }}
                </span>
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.card {
  overflow-x: scroll;
}

.timetable-grid {
  display: grid;
  grid-template-columns: 80px repeat(5, 1fr);
  grid-template-rows: auto repeat(9, auto);
  gap: 8px;
  align-items: stretch;
}

.header-cell {
  background-color:var(--vlbg);
  color: var(--text);
  padding: 10px 12px;
  border:1px solid var(--border2);
  text-align: center;
  font-weight: bold;
  border-radius: var(--border-4);
  font-size: var(--font-size-body);
  box-shadow: var(--input-shadow);
}

.header-cell.current-day-header {
  background-color: var(--gg);
  border-color: var(--not-spinning);
}

.time-header { grid-column: 1; grid-row: 1; }
.day-header { grid-row: 1; min-width: 150px;}

.time-slot-label {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color:transparent;
  font-size: var(--font-size-sub);
  color: var(--sub);
  white-space: nowrap;
}

.slot-number {
  font-weight: bold;
  font-size: var(--font-size-title);
  color: var(--text);
}

.slot-time { font-size: var(--font-size-footnote); }

/* GROUP CONTAINER */
.lesson-group-container {
  background-color: var(--vlbg);
  border-radius: var(--border-4);
  border:1px solid var(--border2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2;
  transition: background-color 0.3s ease;
  box-shadow: var(--input-shadow);
}

.lesson-group-container.current-day {
  background-color: var(--gg);
  border-color: var(--not-spinning);
}

/* --- HIGHLIGHT LOGIC --- */
.lesson-group-container.highlight-active {
  background-color: var(--text) !important;
  border-color: var(--text);
}

/* SUB LESSON ITEM */
.sub-lesson-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 8px;
}

.sub-lesson-item.has-border {
  border-bottom: 1px solid var(--border2);
}

.lesson-group-container.current-day .sub-lesson-item.has-border {
  border-bottom: 1px solid var(--not-spinning);
}

.ausfall-label {
  color: var(--danger);
  font-weight: bold;
  font-size: var(--font-size-body);
}

.lesson-subject {
  font-weight: bold;
  font-size: var(--font-size-body);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lesson-details {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sub);
  color: var(--sub);
  margin-top: 2px;
}

/* CHANGE STYLES */
.crossed {
  text-decoration: line-through;
  color: var(--sub);
  margin-right: 4px;
  font-weight: normal;
}
.new-val {
  font-weight: bold;
  color: var(--text);
}

/* OVERRIDES FOR ACTIVE (WHITE BACKGROUND) STATE */
.lesson-group-container.highlight-active .lesson-subject {
  color: var(--lbg);
}

.lesson-group-container.highlight-active .lesson-details {
  color: var(--gg);
}

.lesson-group-container.highlight-active .sub-lesson-item.has-border {
  border-bottom: 1px solid var(--ccc);
}
/* Active State: Cross outs need to be visible against white */
.lesson-group-container.highlight-active .crossed {
  color: var(--not-spinning);
}
/* Active State: New values need to match the dark text theme but stand out */
.lesson-group-container.highlight-active .new-val {
  color: var(--lbg);
}
/* Active State: Ausfall text */
.lesson-group-container.highlight-active .ausfall-label {
  color: var(--danger) !important;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.personalized-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background-color: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-4);
  font-size: var(--font-size-body);
  color: var(--text);
  box-shadow: var(--input-shadow);
}
</style>