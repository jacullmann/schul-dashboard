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

import Timetable from './StundenplanSQL.vue';

const lessonHours = [
  { time: '07:00-07:45', label: '0.' },
  { time: '08:00-08:45', label: '1.' },
  { time: '08:45-09:30', label: '2.' },
  { time: '09:50-10:40', label: '3.' },
  { time: '10:45-11:30', label: '4.' },
  { time: '11:30-12:15', label: '5.' },
  { time: '12:55-13:40', label: '6.' },
  { time: '13:40-14:25', label: '7.' },
  { time: '14:35-15:20', label: '8.' },
  { time: '15:40-16:25', label: '9.' },
  { time: '16:25-17:10', label: '10.' },
  { time: '17:15-18:00', label: '11.' },
];

const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

const scheduleData = [
  {
    time: '07:00-07:45',
    Mo: null,
    Di:null,
    Mi: null,
    Do: null,
    Fr: null,
  },

  {
    time: '08:00-08:45',
    Mo: [ { code: 'ENR', subject: 'EL', room: 'A005' }, { code: 'ENR', subject: 'GL', room: 'A310' }, { code: 'ENR', subject: 'ME', room: 'A311' }, { code: 'ENR', subject: 'WE', room: 'A106' } ],
    Di: [ { code: 'E', subject: 'BA', room: 'A004' }, { code: 'DE', subject: 'PR', room: 'A313' }, { code: 'BI', subject: 'ESC', room: 'A104' }, { code: 'Ge', subject: 'PT', room: 'A311' }, { code: 'INF', subject: 'SÜ', room: 'A-11',  }, { code: '3.F', subject: 'SO', room: 'A309' }     ],
    Mi: [ { code: 'PH', subject: 'PY', room: 'A104' } ],
    Do: [ { code: 'E', subject: 'CN', room: 'A206' }, { code: 'BI', subject: 'ECS', room: 'A207' }, { code: 'MA', subject: 'HR', room: 'A005' }, { code: 'Ge', subject: 'MO', room: 'A104' }, { code: 'MU', subject: 'KE', room: 'A301' }  ],
    Fr: [{ code: 'MA', subject: 'PY', room: 'A110' } ],
  },

  {
    time: '08:45-09:30',
    Mo: [ { code: 'MA', subject: 'PY', room: 'A106' } ],
    Di: [ { code: 'E', subject: 'BA', room: 'A004' }, { code: 'DE', subject: 'PR', room: 'A313' }, { code: 'BI', subject: 'ESC', room: 'A104' }, { code: 'Ge', subject: 'PT', room: 'A311' }, { code: 'INF', subject: 'SÜ', room: 'A-11',  }, { code: '3.F', subject: 'SO', room: 'A309' }     ],
    Mi: [ { code: 'PH', subject: 'PY', room: 'A104' } ],
    Do: [ { code: 'E', subject: 'CN', room: 'A206' }, { code: 'BI', subject: 'ECS', room: 'A207' }, { code: 'MA', subject: 'HR', room: 'A005' }, { code: 'Ge', subject: 'MO', room: 'A104' }, { code: 'MU', subject: 'KE', room: 'A301' }  ],
    Fr: [ { code: 'MA', subject: 'PY', room: 'A110' } ],
  },

  {
    time: '09:50-10:40',
    Mo: [ { code: 'DALTON', room: '' } ],
    Di: [ { code: 'INF', subject: 'SO', room: 'A115' }, { code: 'DALTON', room: '' } ],
    Mi: [{ code: 'DALTON', room: '' }],
    Do: [{ code: 'DALTON', room: '' }],
    Fr: [{ code: 'DALTON', room: '' }],
  },

  {
    time: '10:45-11:30',
    Mo: [{ code: 'BI', subject: 'LU', room: 'A203' }],
    Di: [ { code: 'EK', subject: 'ZM', room: 'A303' } ],
    Mi: [ { code: 'MU', subject: 'RH', room: 'A301' } ],
    Do: [ { code: 'DE', subject: 'GL', room: 'A307' } ],
    Fr: [ { code: 'E', subject: 'AU', room: 'A307' },  ],
  },

  {
    time: '11:30-12:15',
    Mo: [ { code: 'BI', subject: 'LU', room: 'A203' } ],
    Di: [ { code: 'EK', subject: 'ZM', room: 'A303' } ],
    Mi: [ { code: 'MU', subject: 'RH', room: 'A301' } ],
    Do: [ { code: 'DE', subject: 'GL', room: 'A307' } ],
    Fr: [ { code: 'F', subject: 'GL', room: 'A307' } ],
  },

  {
    time: '12:55-13:40',
    Mo: [ { code: 'DE', subject: 'GL', room: 'A307' } ],
    Di: [ { code: 'SP', subject: 'HA', room: 'TH2' } ],
    Mi: [ { code: 'F', subject: 'GL', room: 'A307' } ],
    Do: [ { code: 'ETH', subject: 'KR', room: 'A307' } ],
    Fr: [ { code: 'ENR', subject: 'EL', room: 'A313' }, { code: 'ENR', subject: 'GL', room: 'A310' },  { code: 'ENR', subject: 'ME', room: 'A008' },{ code: 'ENR', subject: 'WE', room: 'A104' } ],
  },

  {
    time: '13:40-14:25',
    Mo: [ { code: 'E', subject: 'AU', room: 'A307' } ],
    Di: [ { code: 'SP', subject: 'HA', room: 'TH2' } ],
    Mi: [ { code: 'KStd', subject: 'GL', room: 'A307' } ],
    Do: [ { code: 'ETH', subject: 'KR', room: 'A307' } ],
    Fr: [ { code: 'ENR', subject: 'EL', room: 'A313' }, { code: 'ENR', subject: 'GL', room: 'A310' },  { code: 'ENR', subject: 'ME', room: 'A008' },{ code: 'ENR', subject: 'WE', room: 'A104' } ],
  },

  {
    time: '14:35-15:20',
    Mo: null,
    Di: [ { subject: 'Theater', room: 'A102' } ],
    Mi: null,
    Do: null,
    Fr: null,
  },

  {
    time: '15:40-16:25',
    Mo: null,
    Di: [ { subject: 'Theater', room: 'A102' } ],
    Mi: null,
    Do: null,
    Fr: null,
  },

  {
    time: '16:25-17:10',
    Mo: null,
    Di: null,
    Mi: null,
    Do: null,
    Fr: null,
  },

  {
    time: '17:15-18:00',
    Mo: null,
    Di: null,
    Mi: null,
    Do: null,
    Fr: null,
  },
];
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
  background-color: #334155;
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
  background-color: #475569;
  padding: 1px 4px;
  border-radius: 3px;
}


.course-item:has(.subject-name:only-child) .subject-name {
  margin-right: 0;
}
</style>