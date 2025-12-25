<script setup lang="ts">
import { ref, computed } from 'vue';
import hw from '../../hwApi'

import { useAdmin } from '../../composables/useAdmin';

const { saveTimetableSub, savingSub } = useAdmin();


// --- Interfaces ---
interface Substitution {
  lessonId: number;
  day?: string; // Not requested in UI, but part of interface
  slot?: number;
  duration?: number;
  subject?: string;
  subject_abbr?: string;
  teacher?: string | null;
  room?: string | null;
  cancelled?: boolean;
  hide?: boolean;
}

interface SubjectMapping {
  name: string;
  abbr: string;
}

// --- Constants ---
const SUBJECTS: SubjectMapping[] = [
  { name: 'Biologie', abbr: 'BI' },
  { name: 'Chemie', abbr: 'CH' },
  { name: 'Deutsch', abbr: 'DE' },
  { name: 'Englisch', abbr: 'ENG' },
  { name: 'Enrichment', abbr: 'ENR' },
  { name: 'Erdkunde', abbr: 'EK' },
  { name: 'Ethik', abbr: 'ETH' },
  { name: 'Französisch', abbr: 'FRZ' },
  { name: 'Geschichte', abbr: 'GE' },
  { name: 'Mathe', abbr: 'MA' },
  { name: 'Musik', abbr: 'MU' },
  { name: 'Physik', abbr: 'PH' },
  { name: 'Politik', abbr: 'PB' },
  { name: 'Sport', abbr: 'SP' },
  { name: 'Theater', abbr: 'TH' },
  { name: 'WPU', abbr: 'WPU' },
  { name: 'Klassenstunde', abbr: 'KSTD' },
  { name: 'Dalton', abbr: 'DAL' },
];

const SPECIAL_OPT_NO_CHANGES = 'NO_CHANGES';
const SPECIAL_OPT_CUSTOM = 'CUSTOM';

// --- State ---
const form = ref({
  lessonId: 21,
  selectedSubjectMode: 'Sport', // Default to Sport as per example
  customSubject: '',
  slot: null as number | null,
  duration: null as number | null,
  teacher: 'Hr. Schmidt',
  room: 'TH2',
  isCancelled: false,
  isHidden: false,
});

// --- Logic ---

const generatedJson = computed((): Substitution => {
  // Base object - lessonId is always required
  const output: Substitution = {
    lessonId: form.value.lessonId
  };

  // 1. Hide Logic (Overrules everything)
  if (form.value.isHidden) {
    output.hide = true;
    return output;
  }

  // 2. Cancelled Logic
  if (form.value.isCancelled) {
    output.cancelled = true;

    // In cancelled state, we ONLY include slot or duration if they are explicitly set
    if (form.value.slot) output.slot = form.value.slot;
    if (form.value.duration) output.duration = form.value.duration;

    // Do not include teacher, subject, room
    return output;
  }

  // 3. Standard Logic (Not Hidden, Not Cancelled)

  // Slot & Duration
  if (form.value.slot) output.slot = form.value.slot;
  if (form.value.duration) output.duration = form.value.duration;

  // Teacher & Room
  if (form.value.teacher) output.teacher = form.value.teacher;
  if (form.value.room) output.room = form.value.room;

  // Subject Logic
  if (form.value.selectedSubjectMode === SPECIAL_OPT_CUSTOM) {
    // Custom: Use the text input, no abbreviation
    if (form.value.customSubject) {
      output.subject = form.value.customSubject;
    }
  } else if (form.value.selectedSubjectMode !== SPECIAL_OPT_NO_CHANGES) {
    // Standard Selection: Find the abbreviation
    const found = SUBJECTS.find(s => s.name === form.value.selectedSubjectMode);
    if (found) {
      output.subject = found.name;
      output.subject_abbr = found.abbr;
    }
  }
  // If NO_CHANGES is selected, we simply don't add subject/subject_abbr keys

  return output;
});

const jsonString = computed(() => JSON.stringify(generatedJson.value, null, 2));

// Helper to copy to clipboard
const copyToClipboard = () => {
  navigator.clipboard.writeText(jsonString.value);
};

async function saveSub() {
  try {
    await saveTimetableSub(generatedJson.value);
    form.value = {
      lessonId: 21,
      selectedSubjectMode: 'Sport',
      customSubject: '',
      slot: null,
      duration: null,
      teacher: 'Hr. Schmidt',
      room: 'TH2',
      isCancelled: false,
      isHidden: false,
    };
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  }
}
</script>

<template>

      <div class="form-grid">
        <div class="form-group full-width">
          <label for="lessonId">Lesson ID</label>
          <input
              id="lessonId"
              type="number"
              v-model="form.lessonId"
              placeholder="e.g. 21"
          />
        </div>

        <div class="form-group full-width">
          <label for="subjectSelect">Subject</label>
          <select id="subjectSelect" v-model="form.selectedSubjectMode">
            <option :value="SPECIAL_OPT_NO_CHANGES">No Changes</option>
            <option disabled>---</option>
            <option v-for="sub in SUBJECTS" :key="sub.abbr" :value="sub.name">
              {{ sub.name }} ({{ sub.abbr }})
            </option>
            <option disabled>---</option>
            <option :value="SPECIAL_OPT_CUSTOM">Custom Subject</option>
          </select>
        </div>

        <div
            v-if="form.selectedSubjectMode === SPECIAL_OPT_CUSTOM"
            class="form-group full-width fade-in"
        >
          <label for="customSubject">Custom Subject Name</label>
          <input
              id="customSubject"
              type="text"
              v-model="form.customSubject"
              placeholder="Enter subject name"
          />
        </div>

        <div class="form-group">
          <label for="teacher">Teacher</label>
          <input
              id="teacher"
              type="text"
              v-model="form.teacher"
              placeholder="e.g. Hr. Schmidt"
              :disabled="form.isCancelled || form.isHidden"
              :class="{ disabled: form.isCancelled || form.isHidden }"
          />
        </div>

        <div class="form-group">
          <label for="room">Room</label>
          <input
              id="room"
              type="text"
              v-model="form.room"
              placeholder="e.g. TH2"
              :disabled="form.isCancelled || form.isHidden"
              :class="{ disabled: form.isCancelled || form.isHidden }"
          />
        </div>

        <div class="form-group">
          <label for="slot">Custom Slot</label>
          <input
              id="slot"
              type="number"
              v-model="form.slot"
              placeholder="Optional"
              :disabled="form.isHidden"
          />
        </div>

        <div class="form-group">
          <label for="duration">Duration</label>
          <input
              id="duration"
              type="number"
              v-model="form.duration"
              placeholder="Optional"
              :disabled="form.isHidden"
          />
        </div>

        <div class="checkbox-group full-width">
          <label class="checkbox-container">
            <input type="checkbox" v-model="form.isCancelled">
            <span class="checkmark"></span>
            <span class="label-text">Cancelled</span>
          </label>

          <label class="checkbox-container">
            <input type="checkbox" v-model="form.isHidden">
            <span class="checkmark"></span>
            <span class="label-text">Hide (Overrules Cancel)</span>
          </label>
        </div>
      </div>

      <div class="output-section">
        <div class="output-header">
          <span class="label">Generated JSON</span>
          <button @click="copyToClipboard" class="copy-btn">Copy</button>
        </div>
        <pre>{{ jsonString }}</pre>
      </div>
  <div class="actions">
    <button
        @click="saveSub"
        class="btn ghost"
        :disabled="savingSub"
    >
      {{ savingSub ? 'Speichern...' : 'Als Änderung speichern' }}
    </button>
  </div>

</template>

<style scoped>
header {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
}
.actions {
  margin-top: 1rem;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.full-width {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  color: var(--sub);
  font-size: 0.85rem;
  font-weight: 500;
}

/* --- Inputs --- */
input[type="text"],
input[type="number"],
select {
  background-color: var(--vlbg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 12px;
  border-radius: 6px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus,
select:focus {
  border-color: #666;
}

input.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  text-decoration: line-through;
}

/* --- Checkboxes --- */
.checkbox-group {
  display: flex;
  gap: 2rem;
  margin-top: 0.5rem;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  height: 20px;
  width: 20px;
  background-color: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
}

.checkbox-container:hover input ~ .checkmark {
  border-color: #666;
}

.checkbox-container input:checked ~ .checkmark {
  background-color: var(--text);
  border-color: var(--text);
}

.checkbox-container input:checked ~ .checkmark:after {
  content: "";
  position: absolute;
  display: block;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid var(--bg);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.label-text {
  font-size: 0.9rem;
}

/* --- Output --- */
.output-section {
  margin-top: 2rem;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.copy-btn {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--sub);
  padding: 4px 10px;
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--vlbg);
  color: var(--text);
}

pre {
  background-color: var(--vlbg);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.9rem;
  margin: 0;
}

/* --- Animation --- */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>