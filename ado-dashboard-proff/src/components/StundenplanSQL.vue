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
      <tr v-for="(scheduleItem) in data" :key="scheduleItem.time">
        <td class="time-label">{{ getHourLabel(scheduleItem.time) }}</td>

        <td v-for="day in days" :key="day" class="lesson-cell">
          <slot :name="`cell-${day}`" :lesson="scheduleItem[day]" :hour="scheduleItem.time">
            <div v-if="scheduleItem[day] && Array.isArray(scheduleItem[day])" class="lesson-group">
              <div v-for="(course, index) in scheduleItem[day]" :key="index" class="lesson-content">
                <div class="subject">{{ course.subject }}</div>
                <div class="details">
                  {{ course.room }} <span v-if="course.teacher">• {{ course.teacher }}</span>
                </div>
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
</script>

<style scoped>
.timetable-container {
  overflow-x: auto;
  margin: 20px 0;
}

.timetable {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
  background-color: #101010 ;
}

.time-header, .day-header {
  background-color: #101010;
  color: #f1f1f1;
  padding: 10px 10px;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid #aaaaaa;
}

.time-label {
  background-color: #252525;
  color: #f1f1f1;
  font-weight: 600;
  padding: 12px 10px;
  text-align: right;
}

.lesson-cell {
  padding: 5px;
  border: 1px solid #aaaaaa;
  vertical-align: top;
  transition: background-color 0.3s;
  background-color: #101010 ;
}


.lesson-content {
  display: flex;
  flex-direction: column;
}

.subject {
  font-weight: 700;
  color: var(--text);
  font-size: 1.1em;
  margin-bottom: 4px;
}

.details {
  font-size: 0.85em;
  color: #aaaaaa;
}

.free-time {
  color: #f1f1f1;
  text-align: center;
  padding: 10px 0;
}
</style>