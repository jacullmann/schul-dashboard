<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import hw from "../hwApi";
import InfoPop from '../components/info/InfoModalCenter.vue'

interface Lesson {
  id: number;
  day: string;
  slot: number;
  duration: number;
  subject: string;
  subject_abbr?: string;
  teacher: string | null;
  room: string | null;
  _original?: Lesson;
  cancelled?: boolean;
}

interface Substitution {
  lessonId: number;
  day?: string;
  slot?: number;
  duration?: number;
  subject?: string;
  subject_abbr?: string;
  teacher?: string | null;
  room?: string | null;
  cancelled?: boolean;
  hide?: boolean;
}

interface TimeSlot {
  slot: number;
  time: string;
}

const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
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

const jsonData: Lesson[] = [
  { "id": 1, "day": "Montag", "slot": 1, "duration": 1, "room": "A005", "teacher": "Fr. Ellsiepen", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 2, "day": "Montag", "slot": 1, "duration": 1, "room": "A106", "teacher": "Hr. Weber", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 3, "day": "Montag", "slot": 1, "duration": 1, "room": "A310", "teacher": "Fr. Glier", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 4, "day": "Montag", "slot": 1, "duration": 1, "room": "A311", "teacher": "Hr. Müller", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 5, "day": "Montag", "slot": 2, "duration": 1, "room": "A106", "teacher": "Fr. Prey", "subject": "Mathe", "subject_abbr": "MA" },
  { "id": 6, "day": "Montag", "slot": 3, "duration": 1, "room": null, "teacher": null, "subject": "Dalton", "subject_abbr": "DAL" },
  { "id": 7, "day": "Montag", "slot": 4, "duration": 2, "room": "A203", "teacher": "Hr. Luxen", "subject": "Biologie", "subject_abbr": "BI" },
  { "id": 8, "day": "Montag", "slot": 6, "duration": 1, "room": "A307", "teacher": "Fr. Glier", "subject": "Deutsch", "subject_abbr": "DE" },
  { "id": 9, "day": "Montag", "slot": 7, "duration": 1, "room": "A307", "teacher": "Hr. Austerfield", "subject": "Englisch", "subject_abbr": "ENG" },
  { "id": 10, "day": "Dienstag", "slot": 1, "duration": 2, "room": "A-115", "teacher": "Hr. Schlüter", "subject": "Informatik", "subject_abbr": "INF" },
  { "id": 11, "day": "Dienstag", "slot": 1, "duration": 2, "room": "A004", "teacher": "Fr. Blanke", "subject": "Englisch", "subject_abbr": "ENG" },
  { "id": 12, "day": "Dienstag", "slot": 1, "duration": 2, "room": "A104", "teacher": "Fr. Eckers", "subject": "Biologie", "subject_abbr": "BI" },
  { "id": 13, "day": "Dienstag", "slot": 1, "duration": 2, "room": "A309", "teacher": "Fr. Sonnemann", "subject": "Latein", "subject_abbr": "LA" },
  { "id": 14, "day": "Dienstag", "slot": 1, "duration": 2, "room": "A311", "teacher": "Hr. Peukert", "subject": "GeWi", "subject_abbr": "GEWI" },
  { "id": 15, "day": "Dienstag", "slot": 1, "duration": 2, "room": "A313", "teacher": "Hr. Preuß", "subject": "Deutsch", "subject_abbr": "DE" },
  { "id": 16, "day": "Dienstag", "slot": 3, "duration": 1, "room": null, "teacher": null, "subject": "Dalton", "subject_abbr": "DAL" },
  { "id": 17, "day": "Dienstag", "slot": 3, "duration": 1, "room": "A-115", "teacher": "Hr. Schlüter", "subject": "Informatik", "subject_abbr": "INF" },
  { "id": 18, "day": "Dienstag", "slot": 4, "duration": 2, "room": "A303", "teacher": "Hr. Zimmermann", "subject": "Erdkunde", "subject_abbr": "EK" },
  { "id": 19, "day": "Dienstag", "slot": 6, "duration": 2, "room": "TH2", "teacher": "Fr. Haupt", "subject": "Sport", "subject_abbr": "SP" },
  { "id": 20, "day": "Dienstag", "slot": 8, "duration": 2, "room": "A102", "teacher": "Hr. Magnus", "subject": "Theater", "subject_abbr": "TH" },
  { "id": 21, "day": "Mittwoch", "slot": 1, "duration": 2, "room": "A104", "teacher": "Fr. Prey", "subject": "Physik", "subject_abbr": "PH" },
  { "id": 22, "day": "Mittwoch", "slot": 3, "duration": 1, "room": null, "teacher": null, "subject": "Dalton", "subject_abbr": "DAL" },
  { "id": 23, "day": "Mittwoch", "slot": 4, "duration": 2, "room": "A301", "teacher": "Fr. Rehlinghaus", "subject": "Musik", "subject_abbr": "MU" },
  { "id": 24, "day": "Mittwoch", "slot": 6, "duration": 1, "room": "A307", "teacher": "Fr. Glier", "subject": "Französisch", "subject_abbr": "FRZ" },
  { "id": 25, "day": "Mittwoch", "slot": 7, "duration": 1, "room": "A307", "teacher": "Fr. Glier", "subject": "Klassenstunde", "subject_abbr": "KSTD" },
  { "id": 26, "day": "Donnerstag", "slot": 1, "duration": 2, "room": "A005", "teacher": "Hr. Herrmann", "subject": "Mathe", "subject_abbr": "MA" },
  { "id": 27, "day": "Donnerstag", "slot": 1, "duration": 2, "room": "A104", "teacher": "Hr. Moresmau", "subject": "GeWi", "subject_abbr": "GEWI" },
  { "id": 28, "day": "Donnerstag", "slot": 1, "duration": 2, "room": "A206", "teacher": "Hr. Chahine", "subject": "Englisch", "subject_abbr": "ENG" },
  { "id": 29, "day": "Donnerstag", "slot": 1, "duration": 2, "room": "A207", "teacher": "Fr. Eckers", "subject": "Biologie", "subject_abbr": "BI" },
  { "id": 30, "day": "Donnerstag", "slot": 1, "duration": 2, "room": "A301", "teacher": "Fr. Klein", "subject": "Musik", "subject_abbr": "MU" },
  { "id": 31, "day": "Donnerstag", "slot": 3, "duration": 1, "room": null, "teacher": null, "subject": "Dalton", "subject_abbr": "DAL" },
  { "id": 32, "day": "Donnerstag", "slot": 4, "duration": 2, "room": "A307", "teacher": "Fr. Glier", "subject": "Deutsch", "subject_abbr": "DE" },
  { "id": 33, "day": "Donnerstag", "slot": 6, "duration": 2, "room": "A307", "teacher": "Hr. Kröse", "subject": "Ethik", "subject_abbr": "ETH" },
  { "id": 34, "day": "Freitag", "slot": 1, "duration": 2, "room": "A110", "teacher": "Fr. Prey", "subject": "Mathe", "subject_abbr": "MA" },
  { "id": 35, "day": "Freitag", "slot": 3, "duration": 1, "room": null, "teacher": null, "subject": "Dalton", "subject_abbr": "DAL" },
  { "id": 36, "day": "Freitag", "slot": 4, "duration": 1, "room": "A307", "teacher": "Hr. Austerfield", "subject": "Englisch", "subject_abbr": "ENG" },
  { "id": 37, "day": "Freitag", "slot": 5, "duration": 1, "room": "A307", "teacher": "Fr. Glier", "subject": "Französisch", "subject_abbr": "FRZ" },
  { "id": 38, "day": "Freitag", "slot": 6, "duration": 2, "room": "A008", "teacher": "Hr. Müller", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 39, "day": "Freitag", "slot": 6, "duration": 2, "room": "A104", "teacher": "Hr. Weber", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 40, "day": "Freitag", "slot": 6, "duration": 2, "room": "A310", "teacher": "Fr. Glier", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 41, "day": "Freitag", "slot": 6, "duration": 2, "room": "A313", "teacher": "Fr. Ellsiepen", "subject": "Enrichment", "subject_abbr": "ENR" },
  { "id": 42, "day": "Freitag", "slot": 8, "duration": 1, "room": "A203", "teacher": "Hr. Luxen", "subject": "Biologie", "subject_abbr": "BI" }
];

const substitutionsData: Substitution[] = [];

const loadingSubs = ref(true);

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

const lessons = ref<Lesson[]>(jsonData);
const substitutions = ref<Substitution[]>(substitutionsData);


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
  loadSubstitutions();
});
onUnmounted(() => {
  clearInterval(timer);
});

const dayMap: Record<string, number> = {
  'Montag': 0, 'Dienstag': 1, 'Mittwoch': 2, 'Donnerstag': 3, 'Freitag': 4
};
// --- Start of new code to add ---

// New computed property to get the name of the current day
const currentDayName = computed(() => {
  const dayIndex = (now.value.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  // Check if it's a weekday (Monday to Friday, 0 to 4)
  if (dayIndex >= 0 && dayIndex < days.length) {
    return days[dayIndex];
  }
  return null; // Not a standard school day in this context (e.g., weekend)
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
    for(let d = 0; d < maxDuration; d++) {
      endMinsOfDay += lessonDurationMins;
      if(d < maxDuration - 1) {
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
</script>

<template>
  <div class="card">
    <div>
      <h2 style="margin-top: 0" class="title-inf">
        Stundenplan
        <InfoPop tooltip="Stundenplan Info" title="Stundenplan">
          <h3>Die digitale Version vom Programm.</h3>

          <h3>Personalisierte Kurse</h3>
          <p>Wenn du bei deinem Account hinterlegt hast, welche Kurse/Wahlfächer du belegst, kannst du automatisch alle Stunden, die dich nicht betreffen, ausblenden lassen. Deine Auswahl kannst du unter deinen Accounteinstellungen anpassen. Wenn du trotzdem alle Stunden sehen willst, kannst du diese Option ebenfalls unter deinen Accounteinstellungen deaktivieren.</p>

          <h3>Live-Änderungen</h3>
          <p>Vertretung, Ausfall, Raumänderungen usw. werden vom Admin-Team zeitnah übertragen und gleich im digitalen Stundenplan angezeigt.</p>
          <div class="info-img-container">
            <img alt="Bild" src="https://res.cloudinary.com/dwysdpvcm/image/upload/v1765474359/Stundenplan_Ausfall_Grafik_b34pcq.webp" class="info-img"/>

          </div>


        </InfoPop>
      </h2>
      <div v-if="loadingSubs" class="small">Lade Änderungen...</div>
    </div>
    <div class="timetable-grid">

      <div class="header-cell time-header">Stunde</div>
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
            <div class="lesson-subject crossed">{{ lesson.subject }}</div>
            <div class="ausfall-label">Ausfall</div>
            <div class="lesson-details">
              <span class="crossed">{{ lesson.room }}</span>
              <span class="crossed">{{ lesson.teacher }}</span>
            </div>
          </div>

          <div v-else>
            <div class="lesson-subject">
              <span v-if="lesson.subject !== lesson._original?.subject" class="crossed">
                {{ lesson._original?.subject }}
              </span>
              <span :class="{ 'new-val': lesson.subject !== lesson._original?.subject }">
                {{ lesson.subject }}
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
  border-radius: 6px;
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
  font-size: 0.85rem;
  color: var(--sub);
  white-space: nowrap;
}

.slot-number {
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--text);
}

.slot-time { font-size: 0.75rem; }

/* GROUP CONTAINER */
.lesson-group-container {
  background-color: var(--vlbg);
  border-radius: 6px;
  border:1px solid var(--border2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2;
  transition: background-color 0.3s ease;
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
  border-bottom: 1px solid var(--not-spinning); /* #414141 */
}

.ausfall-label {
  color: var(--danger);
  font-weight: bold;
  font-size: 0.9rem;
}

.lesson-subject {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lesson-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--sub);
  margin-top: 2px;
}

/* CHANGE STYLES */
.crossed {
  text-decoration: line-through;
  color: var(--not-spinning);
  margin-right: 6px;
  font-weight: normal;
}
.new-val {
  font-weight: bold;
  color: var(--text);
}

/* OVERRIDES FOR ACTIVE (WHITE BACKGROUND) STATE */
.lesson-group-container.highlight-active .lesson-subject {
  color: var(--text--bg);
}

.lesson-group-container.highlight-active .lesson-details {
  color: var(--text--gg);
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
  color: var(--text--bg);
}
/* Active State: Ausfall text */
.lesson-group-container.highlight-active .ausfall-label {
  color: var(--danger);
}

@media (max-width: 768px) {
  .card {
    border-radius: 0;
    padding: 16px;
  }
}
</style>