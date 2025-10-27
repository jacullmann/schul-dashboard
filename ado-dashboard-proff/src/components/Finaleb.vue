<template>
  <div class="card">
    <Timetable
        :data="scheduleData"
        :days="days"
        :lesson-definitions="lessonHours"
    >
      <template v-for="day in days" :key="day" #[`cell-${day}`]="{ lesson, hour }">
        <div v-if="lesson && lesson.length > 0" class="lesson-group">
          <div v-for="(course, index) in lesson" :key="index" class="course-item">
            <div class="subject-room">
              <span class="subject-code">{{ course.code }}</span>
              <span class="subject-name">{{ course.subject }}</span>
              <span class="room">{{ course.room }}</span>
            </div>
          </div>
        </div>
      </template>

    </Timetable>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"; // <-- ref HINZUGEFÜGT
import Timetable from './StundenplanSQL.vue';
import { supabase } from '../composables/Datatable'; // Stellt Verbindung her (aus Datatable.ts)

const lessonHours = ref([])
const days = ref([])
const scheduleData = ref([])

const buildScheduleData = (lessons, hours) => {


  const dataMap = hours.map(hour => {
    const scheduleItem = { time: hour.time, Mo: null, Di: null, Mi: null, Do: null, Fr: null };
    return scheduleItem;
  });

  lessons.forEach(lesson => {
    // Verwendung der verknüpften Zeit: lesson.lesson_hours.time
    const timeSlot = dataMap.find(item => item.time === lesson.lesson_hours.time);

    if (timeSlot) {
      const dayKey = lesson.day_name;

      if (!timeSlot[dayKey]) {
        timeSlot[dayKey] = [];
      }

      const course = {
        code: lesson.code,
        subject: lesson.subject || null,
        room: lesson.room,
      };

      if (lesson.code === 'DALTON') {
        timeSlot[dayKey] = [{ code: 'DALTON', room: '' }];
      } else if (lesson.code !== 'DALTON') {
        if(timeSlot[dayKey].length > 0 && timeSlot[dayKey][0].code === 'DALTON') {
          // Ignoriere andere Fächer, wenn DALTON bereits in diesem Slot ist
        } else {
          timeSlot[dayKey].push(course);
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
  lessonHours.value = hoursData; // <-- Stunden-Definitionen speichern

  // 2. days abrufen
  const {data: daysData, error: daysError} = await supabase
      .from('days')
      .select('name')
      .order('id')
  if (daysError) {
    console.error('Fehler beim Laden der Tage:', daysError);
    return;
  }
  days.value = daysData.map(d => d.name); // <-- Tage speichern

  // 3. schedule_entries abrufen
  const { data: scheduleEntries, error: entriesError } = await supabase // <-- KORREKT: Daten in 'scheduleEntries' speichern
      .from('schedule_entries')
      .select(`*, lesson_hours (time)`);

  if (entriesError) { // <-- KORREKT: Den richtigen Fehler-Namen prüfen
    console.error('Fehler beim Laden der Stundenplaneinträge:', entriesError);
    return;
  }


  // 4. Daten transformieren
  // KORREKT: Das abgerufene Array (scheduleEntries) und die Stunden-Definitionen (hoursData) übergeben
  scheduleData.value = buildScheduleData(scheduleEntries, hoursData);
}


onMounted(() => {
  fetchData()
})

</script>

<style scoped>
.card {
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

h1 {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #93c5fd;
  margin-bottom: 20px;
  border-bottom: 2px solid #475569;
  padding-bottom: 10px;
}

.lesson-group {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 4px;
  padding: 2px;
}

.course-item {
  background-color: #101010 ;
  border: 1px solid #475569;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.85em;
  line-height: 1.2;
}

.subject-room {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subject-code {
  font-weight: 700;
  color: #38bdf8;
  margin-right: 4px;
}

.subject-name {
  flex-grow: 1;
  font-weight: 500;
  color: #f1f5f9;
}

.room {
  font-weight: 400;
  color: #cbd5e1;
  background-color:#282828;
  padding: 1px 4px;
  border-radius: 3px;
}


.course-item:has(.subject-name:only-child) .subject-name {
  margin-right: 0;
}
</style>