<template>
  <div class="card">
    <n-switch
        size="large"
        v-model:value="isPersonalized"
        @update:value="handleSwitch"
        :checked="isPersonalized"
        :checked-value="true"
        :unchecked-value="false"
    >
      <template #checked>Personalisierter Stundenplan</template>
      <template #unchecked>Normaler Stundenplan</template>
    </n-switch>
    <Timetable
        :data="scheduleData"
        :days="days"
        :lesson-definitions="lessonHours"
    >
      <template v-for="day in days" :key="day" #[`cell-${day}`]="{ lesson, hour }">
        <div v-if="lesson && lesson.length > 0" class="lesson-group">
          <div v-for="(course, index) in lesson" :key="index"
               class="course-item"
               :class="{
                 'double-lesson': course.isDoubleLesson,
                 'double-start': course.doubleLessonPosition === 'start',
                 'double-middle': course.doubleLessonPosition === 'middle',
                 'double-end': course.doubleLessonPosition === 'end'
               }">
            <template v-if="!course.isDoubleLesson || course.doubleLessonPosition === 'start'">
              <div class="subject-room">
                <span class="subject-code">{{ course.code }}</span>
                <span class="subject-name">{{ course.subject }}</span>
                <span class="room">{{ course.room }}</span>
              </div>
              <div v-if="course.isDoubleLesson && course.doubleLessonPosition === 'start'"
                   class="double-lesson-indicator">
              </div>
            </template>
          </div>
        </div>
      </template>
    </Timetable>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import Timetable from './StundenplanSQL.vue';
import { supabase } from '../composables/Datatable';

const isPersonalized = ref(false);
const lessonHours = ref([])
const days = ref([])
const scheduleData = ref([])
const doubleLessons = ref([])

// Doppelstunden abrufen
const fetchDoubleLessons = async () => {
  const { data, error } = await supabase
      .from('double_lessons')
      .select('*')
      .order('day_name, start_time');

  if (error) {
    console.error('Fehler beim Laden der Doppelstunden:', error);
    return [];
  }
  return data || [];
}

// Prüfen, ob eine Stunde Teil einer Doppelstunde ist
// In Finaleb.vue - angepasste Funktion für dein Zeitformat
const getDoubleLessonInfo = (day, time, doubleLessonsList) => {
  for (const doubleLesson of doubleLessonsList) {
    if (doubleLesson.day_name === day) {
      const lessonTimes = lessonHours.value.map(h => h.time);
      const startIndex = lessonTimes.indexOf(doubleLesson.start_time);
      const endIndex = lessonTimes.indexOf(doubleLesson.end_time);
      const currentIndex = lessonTimes.indexOf(time);

      if (startIndex !== -1 && endIndex !== -1 && currentIndex >= startIndex && currentIndex <= endIndex) {
        return {
          isDoubleLesson: true,
          doubleLessonPosition:
              currentIndex === startIndex ? 'start' :
                  currentIndex === endIndex ? 'end' : 'middle',
          doubleLessonData: doubleLesson
        };
      }
    }
  }
  return { isDoubleLesson: false, doubleLessonPosition: null, doubleLessonData: null };
};

const buildScheduleData = (lessons, hours, doubleLessonsList) => {
  const dataMap = hours.map(hour => {
    const scheduleItem = { time: hour.time, Mo: null, Di: null, Mi: null, Do: null, Fr: null };
    return scheduleItem;
  });

  // Zuerst Doppelstunden verarbeiten
  doubleLessonsList.forEach(doubleLesson => {
    const lessonTimes = hours.map(h => h.time);
    const startIndex = lessonTimes.indexOf(doubleLesson.start_time);
    const endIndex = lessonTimes.indexOf(doubleLesson.end_time);

    if (startIndex !== -1 && endIndex !== -1) {
      const dayKey = doubleLesson.day_name;

      // Für jede Stunde der Doppelstunde
      for (let i = startIndex; i <= endIndex; i++) {
        if (!dataMap[i][dayKey]) {
          dataMap[i][dayKey] = [];
        }

        const doubleInfo = getDoubleLessonInfo(dayKey, dataMap[i].time, doubleLessonsList);
        const course = {
          code: doubleLesson.code,
          subject: doubleLesson.subject,
          room: doubleLesson.room,
          isDoubleLesson: true,
          doubleLessonPosition: doubleInfo.doubleLessonPosition,
          doubleLessonId: doubleLesson.id
        };

        // Nur hinzufügen, wenn nicht bereits vorhanden
        const exists = dataMap[i][dayKey].some(item =>
            item.doubleLessonId === doubleLesson.id
        );

        if (!exists) {
          dataMap[i][dayKey].push(course);
        }
      }
    }
  });

  // Dann normale Einzelstunden verarbeiten (überschreiben keine Doppelstunden)
  lessons.forEach(lesson => {
    const timeSlot = dataMap.find(item => item.time === lesson.lesson_hours.time);

    if (timeSlot) {
      const dayKey = lesson.day_name;
      const doubleInfo = getDoubleLessonInfo(dayKey, timeSlot.time, doubleLessonsList);

      // Nur hinzufügen, wenn dieser Slot nicht Teil einer Doppelstunde ist
      if (!doubleInfo.isDoubleLesson) {
        if (!timeSlot[dayKey]) {
          timeSlot[dayKey] = [];
        }

        const course = {
          code: lesson.code,
          subject: lesson.subject || null,
          room: lesson.room,
          isDoubleLesson: false,
          doubleLessonPosition: null
        };

        if (lesson.code === 'DALTON') {
          timeSlot[dayKey] = [{ ...course, code: 'DALTON', room: '' }];
        } else if (lesson.code !== 'DALTON') {
          if(timeSlot[dayKey].length > 0 && timeSlot[dayKey][0].code === 'DALTON') {
          } else {
            timeSlot[dayKey].push(course);
          }
        }
      }
    }
  });

  return dataMap;
};

const fetchData = async () => {
  // 1. lesson_hours abrufen
  const { data: hoursData, error: hoursError } = await supabase
      .from('lesson_hours')
      .select('*')
      .order('id')
  if (hoursError) {
    console.error('Fehler beim Laden der Stunden-Definitionen:', hoursError);
    return;
  }
  lessonHours.value = hoursData;

  // 2. days abrufen
  const {data: daysData, error: daysError} = await supabase
      .from('days')
      .select('name')
      .order('id')
  if (daysError) {
    console.error('Fehler beim Laden der Tage:', daysError);
    return;
  }
  days.value = daysData.map(d => d.name);

  // 3. Doppelstunden abrufen
  doubleLessons.value = await fetchDoubleLessons();

  // 4. schedule_entries abrufen
  const { data: scheduleEntries, error: entriesError } = await supabase
      .from('schedule_entries')
      .select(`*, lesson_hours (time)`);

  if (entriesError) {
    console.error('Fehler beim Laden der Stundenplaneinträge:', entriesError);
    return;
  }

  // 5. Daten transformieren mit Doppelstunden-Information
  scheduleData.value = buildScheduleData(scheduleEntries, hoursData, doubleLessons.value);
}

function handleSwitch(newValue) {
  if (newValue) {
    console.log("Der Stundenplan ist nun personalisiert:", isPersonalized)
  } else {
    console.log("Der Stundenplan ist nun personalisiert:", isPersonalized)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.card {
  padding: 24px;
  border-radius: 12px;
  background-color: #1e1e1e;
  border: 1px solid #2d2d2d;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.lesson-group {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
}

.course-item {
  color: #e2e8f0;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 0.85em;
  line-height: 1.3;
  height: 100%;
  box-sizing: border-box;
  margin-bottom: 1px;
}
.course-item.double-lesson {
  margin-bottom: 0;
}

.course-item.double-start {
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  border-bottom: none;
}

.course-item.double-middle {
  border-radius: 0;
  border-bottom: none;
}

.course-item.double-end {
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  margin-bottom: 0;
}

.double-lesson-indicator {
  height: 4px;
  width: 100%;
  border-radius: 2px;
  margin-top: 4px;
}

.subject-room {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.subject-code {
  font-weight: 700;
  margin-right: 6px;
  text-transform: uppercase;
}

.subject-name {
  flex-grow: 1;
  font-weight: 500;
  color: #e2e8f0;
  line-height: 1;
}

.room {
  font-weight: 400;
  color: #cbd5e1;
  background-color: #333333;
  padding: 1px 6px;
  border-radius: 12px;
  font-size: 0.9em;
  margin-left: 8px;
  white-space: nowrap;
}

.course-item:has(.subject-name:only-child) .subject-name {
  margin-right: 0;
}
</style>