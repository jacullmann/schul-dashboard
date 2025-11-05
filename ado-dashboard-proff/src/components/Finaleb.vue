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
import { ref, onMounted } from "vue";
import Timetable from './StundenplanSQL.vue';
import { supabase } from '../composables/Datatable';

const isPersonalized = ref(false);
const lessonHours = ref([])
const days = ref([])
const scheduleData = ref([])
const userProfile = ref(null)

// Benutzerprofil abrufen
const fetchUserProfile = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('https://two34u882345253.onrender.com/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      userProfile.value = await response.json();
      console.log('Benutzerprofil geladen:', userProfile.value);
    } else {
      console.warn('Kein Benutzerprofil gefunden, verwende Standardmodus');
    }
  } catch (error) {
    console.error('Fehler beim Laden des Benutzerprofils:', error);
  }
};

// Mapping für Enrichment-Kurse basierend auf Subject-Codes
const getEnrichmentMapping = (subject) => {
  const mapping = {
    'EL': 1,  // Elektronik/Labor
    'GL': 2,  // Geschichte/Literatur
    'ME': 3,  // Medien
    'WE': 4   // Wirtschaft/Englisch
  };
  return mapping[subject] || 0;
};

const buildScheduleData = (lessons, hours) => {
  const dataMap = hours.map(hour => {
    const scheduleItem = { time: hour.time, Mo: null, Di: null, Mi: null, Do: null, Fr: null };
    return scheduleItem;
  });

  lessons.forEach(lesson => {
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
        // Enrichment-ID basierend auf Subject ermitteln
        enrichmentId: lesson.code === 'ENR' ? getEnrichmentMapping(lesson.subject) : 0
      };

      // Personalisierte Filterung
      if (isPersonalized.value && userProfile.value) {
        const shouldShowCourse = shouldDisplayCourse(course, userProfile.value);
        if (shouldShowCourse) {
          // DALTON-Logik für personalisierten Modus
          if (course.code === 'DALTON') {
            timeSlot[dayKey] = [{ code: 'DALTON', room: '', subject: 'DALTON' }];
          } else {
            timeSlot[dayKey].push(course);
          }
        }
      } else {
        // Normaler Modus - alle Kurse anzeigen
        if (lesson.code === 'DALTON') {
          timeSlot[dayKey] = [{ code: 'DALTON', room: '', subject: 'DALTON' }];
        } else if (lesson.code !== 'DALTON') {
          if(timeSlot[dayKey].length > 0 && timeSlot[dayKey][0].code === 'DALTON') {
            // Ignoriere andere Fächer, wenn DALTON bereits in diesem Slot ist
          } else {
            timeSlot[dayKey].push(course);
          }
        }
      }
    }
  });

  return dataMap;
};

// Entscheidet, ob ein Kurs im personalisierten Modus angezeigt werden soll
const shouldDisplayCourse = (course, profile) => {
  // Dalton immer anzeigen
  if (course.code === 'DALTON') return true;

  // Theater immer anzeigen (basierend auf deiner CSV)
  if (course.subject === 'Theater') return true;

  // Enrichment-Kurse filtern
  if (course.code === 'ENR' && course.enrichmentId !== profile.enrKurs) {
    return false;
  }

  // Standardfächer ohne spezielle Filterung immer anzeigen
  return true;
};

const fetchData = async () => {
  try {
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

    // 3. schedule_entries abrufen
    const { data: scheduleEntries, error: entriesError } = await supabase
        .from('schedule_entries')
        .select(`*, lesson_hours (time)`)
        .order('lesson_hour_id');

    if (entriesError) {
      console.error('Fehler beim Laden der Stundenplaneinträge:', entriesError);
      return;
    }

    console.log('Geladene Stundenplaneinträge:', scheduleEntries);

    // 4. Daten transformieren
    scheduleData.value = buildScheduleData(scheduleEntries, hoursData);
    console.log('Transformierte Stundenplandaten:', scheduleData.value);
  } catch (error) {
    console.error('Fehler in fetchData:', error);
  }
}

function handleSwitch(newValue) {
  isPersonalized.value = newValue;
  console.log("Stundenplan-Modus geändert:", newValue ? "Personalisiert" : "Normal");
  // Daten neu aufbauen mit aktuellem Modus
  fetchData();
}

onMounted(async () => {
  await fetchUserProfile();
  await fetchData();
})
</script>

<style scoped>
.card {
  padding: 20px;
  border-radius: 12px;
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
  font-weight: 600;
  color: #f1f1f1;
  margin-right: 4px;
}

.subject-name {
  flex-grow: 1;
  font-weight: 500;
  color: var(--text);
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