<template>
  <div class="timetable-container">
    <table class="timetable">
      <thead>
      <tr>
        <th class="time-header">Uhrzeit</th>
        <th v-for="day in days" :key="day" class="day-header">
          {{ day }}
        </th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(scheduleItem, index) in data" :key="scheduleItem.time"
          :class="getRowClass(scheduleItem, index)">
        <td class="time-label">{{ getHourLabel(scheduleItem.time) }}</td>
        <td v-for="day in days" :key="day" class="lesson-cell"
            :class="getCellClass(scheduleItem[day], day, scheduleItem.time)">
          <slot :name="`cell-${day}`" :lesson="scheduleItem[day]" :hour="scheduleItem.time">
            <div v-if="scheduleItem[day] && Array.isArray(scheduleItem[day])" class="lesson-group">
              <div v-for="(course, courseIndex) in scheduleItem[day]" :key="courseIndex"
                   class="lesson-content"
                   :class="{
                     'double-lesson': course.isDoubleLesson,
                     'double-start': course.doubleLessonPosition === 'start',
                     'double-middle': course.doubleLessonPosition === 'middle',
                     'double-end': course.doubleLessonPosition === 'end'
                   }">
                <template v-if="!course.isDoubleLesson || course.doubleLessonPosition === 'start'">
                  <div class="subject">{{ course.subject }}</div>
                  <div class="details">
                    {{ course.room }} <span v-if="course.teacher">• {{ course.teacher }}</span>
                  </div>
                  <div v-if="course.isDoubleLesson && course.doubleLessonPosition === 'start'"
                       class="double-lesson-badge">
                    Doppelstunde
                  </div>
                </template>
              </div>
            </div>
            <div v-else-if="scheduleItem[day]" class="lesson-content">
              <div class="subject">{{ scheduleItem[day].subject }}</div>
              <div class="details">
                {{ scheduleItem[day].room }} <span v-if="scheduleItem[day].teacher">• {{ scheduleItem[day].teacher }}</span>
              </div>
            </div>
            <div v-else class="free-time">
            </div>
          </slot>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  days: {
    type: Array,
    required: true,
  },
  lessonDefinitions: {
    type: Array,
    required: true,
  }
});

const getHourLabel = (time) => {
  const definition = props.lessonDefinitions.find(def => def.time === time);
  return definition ? `${definition.label} ${definition.time}` : time;
};

const getRowClass = (scheduleItem, index) => {
  const classes = [];
  return classes.join(' ');
};

const getCellClass = (lesson, day, time) => {
  const classes = [];
  if (lesson && Array.isArray(lesson) && lesson.some(course => course.isDoubleLesson)) {
    classes.push('double-lesson-cell');
  }
  return classes.join(' ');
};
</script>

<style scoped>
.timetable-container {
  overflow-x: auto;
  margin: 20px 0;
  /* Supabase-Stil: dunkler Hintergrund, subtile Schatten */
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.timetable {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 800px;
  background-color: #1a1a1a; /* Haupt-Hintergrundfarbe */
}

.time-header, .day-header {
  /* Supabase-Header-Stil: Dunkel, aber unterscheidbar */
  background-color: #101010;
  color: #f1f1f1;
  padding: 12px 10px;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid #2d2d2d; /* Dunkle Rahmenlinie */
  border-bottom: 2px solid #2d2d2d; /* Akzentuierte Trennlinie unten */
}

.time-label {
  /* Stunde-Labels hervorheben */
  background-color: #161616;
  color: #f1f1f1;
  font-weight: 600;
  padding: 12px 10px;
  text-align: right;
  border-right: 1px solid #2d2d2d;
}

.lesson-cell {
  padding: 0;
  border: 1px solid #2d2d2d;
  vertical-align: top;
  transition: background-color 0.3s;
  background-color: #1a1a1a; /* Zellen-Hintergrund */
}

/* Doppelstunden-Styling */
.double-lesson-cell {
  /* Hier bleibt das Styling zur Entfernung der Trennlinie,
     aber mit der neuen Rahmenfarbe */
  border-bottom-color: #1a1a1a; /* Keine Trennung zwischen Doppelstunden */
}

.lesson-cell:has(.double-middle) {
  border-top: none;
}

.lesson-cell:has(.double-end) {
  border-top: none;
}

.lesson-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 60px;
  padding: 8px 6px;
  box-sizing: border-box; /* Wichtig für die korrekte Größenberechnung */
}

.lesson-content.double-lesson {
  /* Subtiler Blaustich für Doppelstunden (Supabase-Akzentfarbe) */
  background-color: #1e2a3c;
  color: #e2e8f0;
}

.lesson-content.double-start {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.lesson-content.double-middle {
  border-radius: 0;
}

.lesson-content.double-end {
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.double-lesson-badge {
  font-size: 0.7em;
  color: #63b3ed; /* Supabase-Blau */
  margin-top: 4px;
  font-style: italic;
  font-weight: 400;
}

.subject {
  font-weight: 700;
  color: #e2e8f0; /* Hellere Schriftfarbe für guten Kontrast */
  font-size: 1.1em;
  margin-bottom: 4px;
}

.details {
  font-size: 0.85em;
  color: #a0a0a0; /* Gedämpfteres Grau */
}

.free-time {
  color: #505050;
  text-align: center;
  padding: 10px 0;
  font-style: italic;
}
</style>