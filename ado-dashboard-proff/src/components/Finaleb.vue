<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Types ---
interface Lesson {
  id: number;
  day: string;
  slot: number;
  duration: number;
  subject: string;
  teacher: string | null;
  room: string | null;
}

interface TimeSlot {
  slot: number;
  time: string;
}

// --- Configuration ---
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

// --- Mock Data ---
const jsonData: Lesson[] = [
  {
    "id": 1,
    "day": "Montag",
    "slot": 1,
    "duration": 1,
    "room": "A005",
    "teacher": "Fr. Ellsiepen",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 2,
    "day": "Montag",
    "slot": 1,
    "duration": 1,
    "room": "A106",
    "teacher": "Hr. Weber",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 3,
    "day": "Montag",
    "slot": 1,
    "duration": 1,
    "room": "A310",
    "teacher": "Fr. Glier",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 4,
    "day": "Montag",
    "slot": 1,
    "duration": 1,
    "room": "A311",
    "teacher": "Hr. Müller",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 5,
    "day": "Montag",
    "slot": 2,
    "duration": 1,
    "room": "A106",
    "teacher": "Fr. Prey",
    "subject": "Mathe",
    "subject_abbr": "MA"
  },
  {
    "id": 6,
    "day": "Montag",
    "slot": 3,
    "duration": 1,
    "room": null,
    "teacher": null,
    "subject": "Dalton",
    "subject_abbr": "DAL"
  },
  {
    "id": 7,
    "day": "Montag",
    "slot": 4,
    "duration": 2,
    "room": "A203",
    "teacher": "Hr. Luxen",
    "subject": "Biologie",
    "subject_abbr": "BI"
  },
  {
    "id": 8,
    "day": "Montag",
    "slot": 6,
    "duration": 1,
    "room": "A307",
    "teacher": "Fr. Glier",
    "subject": "Deutsch",
    "subject_abbr": "DE"
  },
  {
    "id": 9,
    "day": "Montag",
    "slot": 7,
    "duration": 1,
    "room": "A307",
    "teacher": "Hr. Austerfield",
    "subject": "Englisch",
    "subject_abbr": "ENG"
  },
  {
    "id": 10,
    "day": "Dienstag",
    "slot": 1,
    "duration": 2,
    "room": "A-115",
    "teacher": "Hr. Schlüter",
    "subject": "Informatik",
    "subject_abbr": "INF"
  },
  {
    "id": 11,
    "day": "Dienstag",
    "slot": 1,
    "duration": 2,
    "room": "A004",
    "teacher": "Fr. Blanke",
    "subject": "Englisch",
    "subject_abbr": "ENG"
  },
  {
    "id": 12,
    "day": "Dienstag",
    "slot": 1,
    "duration": 2,
    "room": "A104",
    "teacher": "Fr. Eckers",
    "subject": "Biologie",
    "subject_abbr": "BI"
  },
  {
    "id": 13,
    "day": "Dienstag",
    "slot": 1,
    "duration": 2,
    "room": "A309",
    "teacher": "Fr. Sonnemann",
    "subject": "Latein",
    "subject_abbr": "LA"
  },
  {
    "id": 14,
    "day": "Dienstag",
    "slot": 1,
    "duration": 2,
    "room": "A311",
    "teacher": "Hr. Peukert",
    "subject": "GeWi",
    "subject_abbr": "GEWI"
  },
  {
    "id": 15,
    "day": "Dienstag",
    "slot": 1,
    "duration": 2,
    "room": "A313",
    "teacher": "Hr. Preuß",
    "subject": "Deutsch",
    "subject_abbr": "DE"
  },
  {
    "id": 16,
    "day": "Dienstag",
    "slot": 3,
    "duration": 1,
    "room": null,
    "teacher": null,
    "subject": "Dalton",
    "subject_abbr": "DAL"
  },
  {
    "id": 17,
    "day": "Dienstag",
    "slot": 3,
    "duration": 1,
    "room": "A-115",
    "teacher": "Hr. Schlüter",
    "subject": "Informatik",
    "subject_abbr": "INF"
  },
  {
    "id": 18,
    "day": "Dienstag",
    "slot": 4,
    "duration": 2,
    "room": "A303",
    "teacher": "Hr. Zimmermann",
    "subject": "Erdkunde",
    "subject_abbr": "EK"
  },
  {
    "id": 19,
    "day": "Dienstag",
    "slot": 6,
    "duration": 2,
    "room": "TH2",
    "teacher": "Fr. Haupt",
    "subject": "Sport",
    "subject_abbr": "SP"
  },
  {
    "id": 20,
    "day": "Dienstag",
    "slot": 8,
    "duration": 2,
    "room": "A102",
    "teacher": "Hr. Magnus",
    "subject": "Theater",
    "subject_abbr": "TH"
  },
  {
    "id": 21,
    "day": "Mittwoch",
    "slot": 1,
    "duration": 2,
    "room": "A104",
    "teacher": "Fr. Prey",
    "subject": "Physik",
    "subject_abbr": "PH"
  },
  {
    "id": 22,
    "day": "Mittwoch",
    "slot": 3,
    "duration": 1,
    "room": null,
    "teacher": null,
    "subject": "Dalton",
    "subject_abbr": "DAL"
  },
  {
    "id": 23,
    "day": "Mittwoch",
    "slot": 4,
    "duration": 2,
    "room": "A301",
    "teacher": "Fr. Rehlinghaus",
    "subject": "Musik",
    "subject_abbr": "MU"
  },
  {
    "id": 24,
    "day": "Mittwoch",
    "slot": 6,
    "duration": 1,
    "room": "A307",
    "teacher": "Fr. Glier",
    "subject": "Klassenstunde",
    "subject_abbr": "KSTD"
  },
  {
    "id": 25,
    "day": "Mittwoch",
    "slot": 7,
    "duration": 1,
    "room": "A307",
    "teacher": "Fr. Glier",
    "subject": "Französisch",
    "subject_abbr": "FRZ"
  },
  {
    "id": 26,
    "day": "Donnerstag",
    "slot": 1,
    "duration": 2,
    "room": "A005",
    "teacher": "Hr. Herrmann",
    "subject": "Mathe",
    "subject_abbr": "MA"
  },
  {
    "id": 27,
    "day": "Donnerstag",
    "slot": 1,
    "duration": 2,
    "room": "A104",
    "teacher": "Hr. Moresmau",
    "subject": "GeWi",
    "subject_abbr": "GEWI"
  },
  {
    "id": 28,
    "day": "Donnerstag",
    "slot": 1,
    "duration": 2,
    "room": "A206",
    "teacher": "Hr. Chahine",
    "subject": "Englisch",
    "subject_abbr": "ENG"
  },
  {
    "id": 29,
    "day": "Donnerstag",
    "slot": 1,
    "duration": 2,
    "room": "A207",
    "teacher": "Fr. Eckers",
    "subject": "Biologie",
    "subject_abbr": "BI"
  },
  {
    "id": 30,
    "day": "Donnerstag",
    "slot": 1,
    "duration": 2,
    "room": "A301",
    "teacher": "Fr. Klein",
    "subject": "Musik",
    "subject_abbr": "MU"
  },
  {
    "id": 31,
    "day": "Donnerstag",
    "slot": 3,
    "duration": 1,
    "room": null,
    "teacher": null,
    "subject": "Dalton",
    "subject_abbr": "DAL"
  },
  {
    "id": 32,
    "day": "Donnerstag",
    "slot": 4,
    "duration": 2,
    "room": "A307",
    "teacher": "Fr. Glier",
    "subject": "Deutsch",
    "subject_abbr": "DE"
  },
  {
    "id": 33,
    "day": "Donnerstag",
    "slot": 6,
    "duration": 2,
    "room": "A307",
    "teacher": "Hr. Kröse",
    "subject": "Ethik",
    "subject_abbr": "ETH"
  },
  {
    "id": 34,
    "day": "Freitag",
    "slot": 1,
    "duration": 2,
    "room": "A110",
    "teacher": "Fr. Prey",
    "subject": "Mathe",
    "subject_abbr": "MA"
  },
  {
    "id": 35,
    "day": "Freitag",
    "slot": 3,
    "duration": 1,
    "room": null,
    "teacher": null,
    "subject": "Dalton",
    "subject_abbr": "DAL"
  },
  {
    "id": 36,
    "day": "Freitag",
    "slot": 4,
    "duration": 1,
    "room": "A307",
    "teacher": "Hr. Austerfield",
    "subject": "Englisch",
    "subject_abbr": "ENG"
  },
  {
    "id": 37,
    "day": "Freitag",
    "slot": 5,
    "duration": 1,
    "room": "A307",
    "teacher": "Fr. Glier",
    "subject": "Französisch",
    "subject_abbr": "FRZ"
  },
  {
    "id": 38,
    "day": "Freitag",
    "slot": 6,
    "duration": 2,
    "room": "A008",
    "teacher": "Hr. Müller",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 39,
    "day": "Freitag",
    "slot": 6,
    "duration": 2,
    "room": "A104",
    "teacher": "Hr. Weber",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 40,
    "day": "Freitag",
    "slot": 6,
    "duration": 2,
    "room": "A310",
    "teacher": "Fr. Glier",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 41,
    "day": "Freitag",
    "slot": 6,
    "duration": 2,
    "room": "A313",
    "teacher": "Fr. Ellsiepen",
    "subject": "Enrichment",
    "subject_abbr": "ENR"
  },
  {
    "id": 42,
    "day": "Freitag",
    "slot": 8,
    "duration": 1,
    "room": "A203",
    "teacher": "Hr. Luxen",
    "subject": "Biologie",
    "subject_abbr": "BI"
  }
];

const lessons = ref<Lesson[]>(jsonData);

// --- Logic ---

const formatTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const timeSlots = computed<TimeSlot[]>(() => {
  const slots: TimeSlot[] = [];
  let currentMetrics = (startTimeHour * 60) + startTimeMinute;

  for (let i = 1; i <= totalSlots; i++) {
    const startStr = formatTime(currentMetrics);
    const endMetrics = currentMetrics + lessonDurationMins;
    const endStr = formatTime(endMetrics);

    slots.push({ slot: i, time: `${startStr} - ${endStr}` });

    const breakTime = breaks[i] || 0;
    currentMetrics = endMetrics + breakTime;
  }
  return slots;
});

// Group lessons by "Day-Slot" coordinate
const groupedLessons = computed(() => {
  const groups: Record<string, Lesson[]> = {};

  lessons.value.forEach(lesson => {
    const key = `${lesson.day}-${lesson.slot}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(lesson);
  });

  return groups;
});

// Calculate style for the Container (Group)
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
</script>

<template>
  <div class="card">
    <div class="timetable-grid">

      <div class="header-cell time-header">Stunde</div>
      <div v-for="day in days" :key="day" class="header-cell day-header">
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
          :style="getGroupStyle(group)"
      >
        <div
            v-for="(lesson, index) in group"
            :key="lesson.id"
            class="sub-lesson-item"
            :class="{ 'has-border': index < group.length - 1 }"
        >
          <div class="lesson-subject">{{ lesson.subject }}</div>
          <div class="lesson-details" v-if="lesson.teacher || lesson.room">
            <span class="lesson-room">{{ lesson.room }}</span>
            <span class="lesson-teacher">{{ lesson.teacher }}</span>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 20px;
  overflow-x: scroll;
}

.timetable-grid {
  display: grid;
  grid-template-columns: 110px repeat(5, 1fr);
  grid-template-rows: auto repeat(9, auto);
  gap: 8px;
  align-items: stretch;
}

.header-cell {
  background-color:#282828; /* Header background */
  color: #F1F1F1; /* Header text */
  padding: 12px;
  border:1px solid #414141;
  text-align: center;
  font-weight: bold;
  border-radius: 4px;
}

.time-header { grid-column: 1; grid-row: 1; }
.day-header { grid-row: 1; min-width: 150px;}

.time-slot-label {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color:transparent; /* Label background */
  font-size: 0.85rem;
  color: #AAAAAA; /* Secondary text color */
  white-space: nowrap;
}

.slot-number {
  font-weight: bold;
  font-size: 1.1rem;
  color: #F1F1F1; /* Primary text color */
}

.slot-time { font-size: 0.75rem; }

/* GROUP CONTAINER */
.lesson-group-container {
  background-color: #282828; /* Lesson background */
  border-radius: 4px;
  border:1px solid #414141;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2;
}

/* SUB LESSON ITEM */
.sub-lesson-item {
  /* FIX: Removed flex: 1 and min-height: 0.
     Added flex-shrink: 0 to prevent items from crushing each other. */
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 8px; /* Increased padding slightly for better spacing */
}

.sub-lesson-item.has-border {
  border-bottom: 1px solid #414141; /* Separator border */
}

.lesson-subject {
  font-weight: bold;
  font-size: 0.9rem;
  color: #F1F1F1; /* Subject color */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lesson-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #AAAAAA; /* Details color */
  margin-top: 2px;
}

@media (max-width: 768px) {
  .card {
    border-radius: 0;
    padding: 16px;
  }

}
</style>