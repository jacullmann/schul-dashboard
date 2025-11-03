<script setup lang="ts">
import { ref, computed } from 'vue';
// Lucide Icons importieren
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Tag,
  Info,
  X,
  Pencil
} from 'lucide-vue-next';

// --- TYP-DEFINITIONEN ---

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  color: string;
  description: string; // Neu: Beschreibung für Details
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

// --- DATEN-INITIALISIERUNG ---

// CSS-Klassen für die Termin-Farben
const EVENT_COLORS: { [key: string]: string } = {
  'indigo': '#4f46e5',
  'green': '#10b981',
  'red': '#ef4444',
};

const initialEvents: CalendarEvent[] = [
  {
    id: 1,
    title: 'Wichtige Besprechung',
    start: new Date(2025, 10, 10, 10, 0),
    end: new Date(2025, 10, 10, 11, 30),
    color: 'event-indigo',
    description: 'Abstimmung der Q4-Ziele mit dem Management. Vorbereitung der Präsentation.',
  },
  {
    id: 2,
    title: 'Team-Lunch',
    start: new Date(2025, 10, 10, 12, 30),
    end: new Date(2025, 10, 10, 13, 30),
    color: 'event-green',
    description: 'Pizza-Tag zur Feier des abgeschlossenen Projekts.',
  },
  {
    id: 3,
    title: 'Abgabetermin Projekt X',
    start: new Date(2025, 10, 25, 9, 0),
    end: new Date(2025, 10, 25, 17, 0),
    color: 'event-red',
    description: 'Finale Übergabe an den Kunden. Alle Dokumente müssen unterschrieben sein.',
  },
];

const events = ref<CalendarEvent[]>(initialEvents);
const currentMonth = ref(new Date(2025, 10, 1));

// --- ZUSTAND FÜR DETAILANSICHTEN ---
const selectedDay = ref<CalendarDay | null>(null);
const selectedEvent = ref<CalendarEvent | null>(null);

// --- LOGIK (Wie im vorherigen Beispiel, aber kompakter) ---

const monthInfo = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return { year, month, firstDayOfMonth, lastDayOfMonth };
});

const formattedMonth = computed(() => {
  return currentMonth.value.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
});

const calendarDays = computed<CalendarDay[]>(() => {
  const { year, month, firstDayOfMonth, lastDayOfMonth } = monthInfo.value;
  const days: CalendarDay[] = [];

  let startDayIndex = firstDayOfMonth.getDay();
  if (startDayIndex === 0) startDayIndex = 7;
  const offset = startDayIndex - 1;

  // Vormonat
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = offset; i > 0; i--) {
    days.push(createCalendarDay(new Date(year, month - 1, prevMonthLastDay - i + 1), false));
  }

  // Aktueller Monat
  for (let i = 1; i <= lastDayOfMonth; i++) {
    days.push(createCalendarDay(new Date(year, month, i), true));
  }

  // Folgemonat (Auffüllung bis 42 Felder)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(createCalendarDay(new Date(year, month + 1, i), false));
  }

  return days;
});

function createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dayEvents = events.value.filter(event =>
      event.start.toDateString() === date.toDateString()
  );
  return { date, isCurrentMonth, isToday, events: dayEvents };
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
};

// --- NEUE INTERAKTIONEN ---

const selectDay = (day: CalendarDay) => {
  selectedDay.value = day;
  selectedEvent.value = null; // Event-Ansicht schließen
};

const selectEvent = (event: CalendarEvent) => {
  selectedEvent.value = event;
};

const closeEventDetails = () => {
  selectedEvent.value = null;
};

const goToPrevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
  selectedDay.value = null;
};

const goToNextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
  selectedDay.value = null;
};

const goToToday = () => {
  const today = new Date();
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDay.value = createCalendarDay(today, true); // Heute auswählen
};
</script>

<template>
  <div class="calendar-wrapper">

    <div class="calendar-container">

      <header class="calendar-header">
        <div class="title-group">
          <CalendarIcon class="icon-main" />
          <h2 class="month-title">
            {{ formattedMonth }}
          </h2>
        </div>

        <div class="navigation-group">
          <button
              @click="goToToday"
              class="nav-button today-button"
          >
            Heute
          </button>

          <div class="nav-control-buttons">
            <button @click="goToPrevMonth" class="nav-button control-button border-right" aria-label="Vorheriger Monat">
              <ChevronLeft class="icon-nav" />
            </button>
            <button @click="goToNextMonth" class="nav-button control-button" aria-label="Nächster Monat">
              <ChevronRight class="icon-nav" />
            </button>
          </div>
        </div>
      </header>

      <div class="day-labels-grid">
        <span v-for="day in ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']" :key="day" class="day-label">
          {{ day }}
        </span>
      </div>

      <div class="calendar-grid">
        <div
            v-for="(day, index) in calendarDays"
            :key="index"
            :class="[
            'calendar-day',
            { 'day-inactive': !day.isCurrentMonth },
            { 'day-today': day.isToday },
            { 'day-selected': selectedDay && selectedDay.date.toDateString() === day.date.toDateString() }
          ]"
            @click="selectDay(day)"
        >
          <span
              :class="[
              'day-number',
              { 'number-inactive': !day.isCurrentMonth },
              { 'number-today': day.isToday },
              { 'number-selected': selectedDay && selectedDay.date.toDateString() === day.date.toDateString() }
            ]"
          >
            {{ day.date.getDate() }}
          </span>

          <div v-if="day.events.length" class="event-markers">
            <span
                v-for="(event, i) in day.events.slice(0, 3)"
                :key="i"
                :class="['event-dot', event.color]"
                :style="{ backgroundColor: EVENT_COLORS[event.color.replace('event-', '')] }"
                :title="event.title"
            ></span>
            <span v-if="day.events.length > 3" class="event-dot-more">+</span>
          </div>
        </div>
      </div>
    </div>

    <Transition name="fade-slide">
      <div v-if="selectedDay" class="day-detail-panel">
        <div class="detail-header">
          <Info class="icon-detail" />
          <h3 class="detail-title">
            Termine am {{ formatDate(selectedDay.date) }}
          </h3>
          <button @click="selectedDay = null" class="close-button" aria-label="Details schließen">
            <X class="icon-close" />
          </button>
        </div>

        <div v-if="selectedDay.events.length" class="detail-event-list">
          <div
              v-for="event in selectedDay.events"
              :key="event.id"
              class="detail-event-item"
              @click="selectEvent(event)"
          >
            <div class="event-bar" :style="{ backgroundColor: EVENT_COLORS[event.color.replace('event-', '')] }"></div>
            <div class="event-content">
              <p class="event-item-title">{{ event.title }}</p>
              <p class="event-item-time">
                <Clock class="icon-time" /> {{ formatTime(event.start) }} - {{ formatTime(event.end) }}
              </p>
            </div>
            <button class="event-detail-info">
              <Info class="icon-info" />
            </button>
          </div>
        </div>
        <p v-else class="no-events-message">Keine Termine an diesem Tag.</p>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="selectedEvent" class="event-modal-overlay" @click.self="closeEventDetails">
        <div class="event-modal-content">
          <header class="modal-header" :style="{ borderLeftColor: EVENT_COLORS[selectedEvent.color.replace('event-', '')] }">
            <h4 class="modal-title">{{ selectedEvent.title }}</h4>
            <button @click="closeEventDetails" class="close-button" aria-label="Termindetails schließen">
              <X class="icon-close" />
            </button>
          </header>

          <div class="modal-body">
            <div class="modal-info-line">
              <CalendarIcon class="icon-info-line" />
              <span>Datum: <strong>{{ formatDate(selectedEvent.start) }}</strong></span>
            </div>
            <div class="modal-info-line">
              <Clock class="icon-info-line" />
              <span>Zeit: <strong>{{ formatTime(selectedEvent.start) }} - {{ formatTime(selectedEvent.end) }}</strong></span>
            </div>
            <div class="modal-info-line description">
              <Pencil class="icon-info-line" />
              <p><strong>Beschreibung:</strong> {{ selectedEvent.description }}</p>
            </div>
          </div>

          <footer class="modal-footer">
            <button class="modal-action-button primary">Bearbeiten</button>
            <button class="modal-action-button secondary">Löschen</button>
          </footer>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* --- VARIABLEN & GRUNDSTYLING --- */
:root {
  --color-indigo: #4f46e5;
  --color-indigo-dark: #3730a3;
  --color-green: #10b981;
  --color-red: #ef4444;
  --color-gray-bg: #f9fafb;
  --color-gray-border: #e5e7eb;
  --color-text-dark: #1f2937;
  --color-text-medium: #6b7280;
}

.calendar-wrapper {
  display: flex;
  max-width: 1200px; /* Mehr Platz für Details */
  margin: 40px auto;
  gap: 20px;
}

.calendar-container {
  flex: 1 1 65%; /* Kalender nimmt 65% ein */
  background-color: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* --- HEADER UND NAVIGATION --- */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px; /* Kompakter */
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-gray-border);
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-main {
  width: 24px;
  height: 24px;
  color: var(--color-indigo);
}

.month-title {
  font-size: 1.5rem; /* Kompakter Titel */
  font-weight: 700;
  color: var(--color-text-dark);
}

.navigation-group {
  display: flex;
  gap: 8px;
}

.nav-control-buttons {
  display: flex;
  border: 1px solid var(--color-gray-border);
  border-radius: 6px;
  overflow: hidden;
}

.nav-button {
  padding: 6px 12px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 150ms ease-in-out;
}

.today-button {
  color: white;
  background-color: var(--color-indigo);
  border-radius: 6px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.today-button:hover {
  background-color: var(--color-indigo-dark);
}

.control-button {
  background-color: white;
  color: var(--color-text-medium);
  padding: 6px;
}

.control-button:hover {
  background-color: var(--color-gray-bg);
  color: var(--color-indigo);
}

.border-right {
  border-right: 1px solid var(--color-gray-border);
}

.icon-nav {
  width: 18px; /* Kompakter */
  height: 18px;
  display: block;
}

/* --- WOCHENTAGE --- */
.day-labels-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.75rem; /* Kompakter */
  font-weight: 600;
  color: var(--color-text-medium);
  margin-bottom: 4px;
}

.day-label {
  padding: 4px;
}

/* --- KALENDER-GRID --- */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px; /* Kompakter */
  height: 400px; /* Feste, kleinere Höhe */
  border: 1px solid var(--color-gray-border);
  border-radius: 6px;
  overflow: hidden;
}

.calendar-day {
  position: relative;
  padding: 6px;
  border: 1px solid var(--color-gray-border);
  background-color: white;
  cursor: pointer;
  transition: all 150ms ease-in-out;
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* Rechtsbündig für das Datum */
}

.calendar-day:hover {
  background-color: #f3f4f6;
}

/* Status-Styles */
.day-inactive {
  background-color: #fafafa;
  border-color: #f3f4ff;
  opacity: 0.8;
}

.day-today {
  box-shadow: inset 0 0 0 2px var(--color-indigo);
}

.day-selected {
  background-color: #eef2ff; /* Hellblau */
  border-color: var(--color-indigo);
}


/* --- TAG NUMMER --- */
.day-number {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-dark);
}

.number-inactive {
  color: #9ca3af;
}

.number-today {
  color: var(--color-indigo);
  font-weight: 700;
}

.number-selected {
  color: var(--color-indigo-dark);
}

/* --- EVENT MARKER (DOTS) --- */
.event-markers {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin-top: 4px;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0.9;
  transition: opacity 150ms ease-in-out;
}

.event-dot-more {
  font-size: 0.6rem;
  line-height: 1;
  font-weight: 600;
  color: var(--color-text-medium);
}

/* --- TAGES-DETAIL ANSICHT (RECHTER PANEL) --- */
.day-detail-panel {
  flex: 1 1 35%; /* Panel nimmt 35% ein */
  background-color: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid var(--color-indigo);
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.detail-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-dark);
  margin-left: 8px;
  flex-grow: 1;
}

.icon-detail {
  width: 20px;
  height: 20px;
  color: var(--color-indigo);
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-button:hover {
  background-color: var(--color-gray-bg);
}

.icon-close {
  width: 18px;
  height: 18px;
  color: var(--color-text-medium);
}

.detail-event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-event-item {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-gray-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 200ms ease-in-out;
}

.detail-event-item:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.event-bar {
  width: 5px;
  height: 100%;
  flex-shrink: 0;
}

.event-content {
  padding: 8px 12px;
  flex-grow: 1;
}

.event-item-title {
  font-weight: 600;
  color: var(--color-text-dark);
  font-size: 0.95rem;
  margin-bottom: 2px;
}

.event-item-time {
  font-size: 0.8rem;
  color: var(--color-text-medium);
}

.icon-time {
  width: 12px;
  height: 12px;
  margin-right: 4px;
  vertical-align: sub;
}

.event-detail-info {
  background: none;
  border: none;
  padding: 0 12px;
  height: 100%;
  color: var(--color-indigo);
  cursor: pointer;
  transition: background-color 150ms;
}

.event-detail-info:hover {
  background-color: #eef2ff;
}

.icon-info {
  width: 16px;
  height: 16px;
}

.no-events-message {
  font-style: italic;
  color: var(--color-text-medium);
  text-align: center;
  padding: 20px;
}

/* --- TERMIN-DETAIL MODAL --- */
.event-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.event-modal-content {
  background-color: white;
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-left: 8px solid; /* Wird dynamisch mit Event-Farbe gesetzt */
  background-color: var(--color-gray-bg);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-dark);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-info-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 1rem;
  color: var(--color-text-dark);
}

.modal-info-line.description {
  line-height: 1.5;
}

.icon-info-line {
  width: 20px;
  height: 20px;
  color: var(--color-indigo);
  flex-shrink: 0;
  margin-top: 2px;
}

.modal-footer {
  border-top: 1px solid var(--color-gray-border);
  padding: 15px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-action-button {
  padding: 8px 15px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
}

.modal-action-button.primary {
  background-color: var(--color-indigo);
  color: white;
  border: 1px solid var(--color-indigo);
}
.modal-action-button.primary:hover {
  background-color: var(--color-indigo-dark);
}

.modal-action-button.secondary {
  background-color: white;
  color: var(--color-text-medium);
  border: 1px solid var(--color-gray-border);
}
.modal-action-button.secondary:hover {
  background-color: var(--color-gray-bg);
}

/* --- TRANSITIONEN --- */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 300ms ease-in-out;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 300ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>