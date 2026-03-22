<script setup lang="ts">
import { ref } from 'vue';
import { RefreshCw, Trash2 } from 'lucide-vue-next';
import InfoModal from '@/common/components/InfoModal.vue';
import Checkbox from '@/common/components/Checkbox.vue';
import AdminTimetable from '@/modules/admin/components/AdminTimetable.vue';
import type { TimetableSubstitution } from '@/modules/admin/types';
import type { Lesson } from '@/modules/schedule/types';

const props = defineProps<{
  subs: TimetableSubstitution[];
  loadingSubs: boolean;
  lessons: Lesson[];
  loadingLessons: boolean;
  savingSub: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'save-sub', payload: Record<string, unknown>): void;
  (e: 'delete-sub', id: string): void;
}>();

const subForm = ref({
  lessonId: '',
  subject: '',
  room: '',
  slot: null as number | null,
  duration: null as number | null,
  day: null as number | null,
  cancelled: false,
  hide: false,
});

const selectedLesson = ref<Lesson | null>(null);

function getDisplayName(lesson: Lesson): string {
  const subjectName = lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
  return subjectName ? subjectName : 'Unbekannt';
}

function onLessonSelected(lesson: Lesson) {
  selectedLesson.value = lesson;
  subForm.value.lessonId = lesson.id;
  subForm.value.subject = '';
  subForm.value.room = '';
  subForm.value.slot = null;
  subForm.value.duration = null;
  subForm.value.day = null;
  subForm.value.cancelled = false;
  subForm.value.hide = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSaveSub() {
  const payload: Record<string, unknown> = { lessonId: subForm.value.lessonId };
  if (subForm.value.subject) payload.subject = subForm.value.subject;
  if (subForm.value.room) payload.room = subForm.value.room;
  if (subForm.value.slot !== null) payload.slot = subForm.value.slot;
  if (subForm.value.duration !== null) payload.duration = subForm.value.duration;
  if (subForm.value.day !== null) payload.day = subForm.value.day;
  if (subForm.value.cancelled) payload.cancelled = true;
  if (subForm.value.hide) payload.hide = true;

  emit('save-sub', payload);
  // Do not reset right away in case of error, 
  // but if the parent completes it, we can reset.
  // Assuming parent does it immediately or we just reset opportunistically 
  // (GroupAdminDashboard previously did it without waiting for promise to resolve, actually wait it did wait for `.then()`)
  // Oh wait, `saveSub` in useGroupAdmin returns a promise, so we can just let parent handle the save, but parent function handles resetting?
  // Let's rely on parent to pass a wrapper if we want `.then()`, or we can just reset state here
  // GroupAdminDashboard.vue: `saveSub(payload).then(() => { ... })`
  // Since emit doesn't return a promise, we can provide a callback or just reset immediately. We'll reset immediately.
  subForm.value = { lessonId: '', subject: '', room: '', slot: null, duration: null, day: null, cancelled: false, hide: false };
  selectedLesson.value = null;
}
</script>

<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="title-inf">
        <h2>Stundenplanänderungen</h2>
        <InfoModal
          tooltip="Übersicht des Adminstundenplanmenüs"
          title="Stundenplanänderungen"
        >
          <h3>Trage Änderungen Live und anschaulich ein</h3>

          <h3>Stunden auswählen</h3>
          <p>Klicke in der Stundenplanansicht die Stunden an, die du ändern möchtest.</p>

          <h3>Änderungen eintragen</h3>
          <p>Schreibe in die passenden Textfelder die neuen Daten. Falls ein Wert gleichbleiben soll, kannst du das Feld freilassen. Mit den entsprechenden Checkboxen kannst du auch markieren ob Stunden ausfallen oder Stunden ganz verbergen.</p>
        </InfoModal>
      </div>
      <button class="btn ghost" @click="emit('refresh')" :disabled="loadingSubs">
        <RefreshCw :size="14" :class="{ 'spin-icon': loadingSubs }" />
        <span>Aktualisieren</span>
      </button>
    </div>

    <!-- Create Form -->
    <h3 v-if="!selectedLesson" style="color: var(--sub); margin-bottom: 24px;">Bitte wählen Sie eine Stunde aus dem Stundenplan.</h3>
    
    <div v-if="selectedLesson">
      <h3 style="margin-top: 0; margin-bottom: 8px; font-size: var(--font-size-title);">Ausgewählte Stunde</h3>
      <p style="margin: 0 0 16px 0; color: var(--sub); font-size: var(--font-size-body);">
        Ersetzt: <strong>{{ getDisplayName(selectedLesson) }}</strong> 
        (Stunde: {{ selectedLesson.slot }}, Letzte Stunde: {{ selectedLesson.slot + selectedLesson.duration - 1 }}, Raum: {{ selectedLesson.room || '-' }}, Tag: {{ selectedLesson.day }})
      </p>

      <div class="sub-form-grid">
        <input type="hidden" v-model="subForm.lessonId" />
        <div class="form-field">
          <label>Neues Fach</label>
          <input v-model="subForm.subject" placeholder="Deutsch" class="input" />
        </div>
        <div class="form-field">
          <label>Neuer Raum</label>
          <input v-model="subForm.room" placeholder="A101" class="input" />
        </div>
        <div class="form-field">
          <label>Neue Stunde</label>
          <input v-model.number="subForm.slot" type="number" placeholder="4" class="input" />
        </div>
        <div class="form-field">
          <label>Neue Dauer</label>
          <input v-model.number="subForm.duration" type="number" min="1" placeholder="2" class="input" />
        </div>
        <div class="form-field">
          <label>Neuer Tag (1 = Mo, 5 = Fr)</label>
          <input v-model.number="subForm.day" type="number" min="1" max="5" placeholder="2" class="input" />
        </div>
      </div>

      <div style="display: flex; gap: 24px; margin: 16px 0 24px 0;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-body); cursor: pointer;">
          <Checkbox v-model="subForm.cancelled" />
          <span>Ausfall</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: var(--font-size-body); cursor: pointer;">
          <Checkbox v-model="subForm.hide" />
          <span>Verstecken</span>
        </label>
      </div>

      <button class="btn action" @click="handleSaveSub" :disabled="savingSub || !subForm.lessonId">
        {{ savingSub ? 'Speichert...' : 'Speichern' }}
      </button>
    </div>

    <h3 style="padding: 20px 20px 0 20px; font-size: var(--font-size-title);">Stunde auswählen</h3>
    <div v-if="loadingLessons" class="empty-hint">Lade Stundenplan...</div>
    <AdminTimetable v-else :lessons="lessons" :selectedLessonId="subForm.lessonId" @select-lesson="onLessonSelected" style="padding: 20px;" />

    <!-- Existing Subs -->
    <div v-if="subs.length === 0 && !loadingSubs" class="empty-hint">Keine Substitutions vorhanden.</div>
    <div v-else class="subs-list">
      <div v-for="sub in subs" :key="sub.id" class="sub-row">
        <div class="sub-row-info">
          <span v-if="sub.subject" class="sub-row-tag">{{ sub.subject }}</span>
          <span v-else class="sub-row-tag">Unbekannt</span>
          <span class="sub-row-detail" v-if="sub.slot">Stunde: {{ sub.slot }}</span>
          <span class="sub-row-detail" v-if="sub.day">Tag: {{ sub.day }}</span>
          <span v-if="sub.cancelled" class="sub-row-tag danger">Ausfall</span>
          <span v-if="sub.hide" class="sub-row-tag muted">Versteckt</span>
          <span v-if="sub.room" class="sub-row-detail">Raum: {{ sub.room }}</span>
        </div>
        <button class="btn-icon danger" @click="emit('delete-sub', sub.id)" title="Löschen">
          <Trash2 :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-panel { animation: fadeUp 0.2s ease; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.panel-header .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sub);
}

.title-inf {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: var(--font-size-sub);
  color: var(--sub);
  margin-bottom: 4px;
  font-weight: 500;
}

.checkbox-field label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-body);
  cursor: pointer;
  padding-top: 20px;
}

.subs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
  border-radius: 10px;
  gap: 8px;
}

.sub-row-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sub-row-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-interactive-hover);
  color: var(--text-default);
}

.sub-row-tag.danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.sub-row-tag.muted { background: var(--bg-interactive-hover); color: var(--sub); }

.sub-row-detail {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--sub);
  font-size: var(--font-size-body);
}

.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--sub);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-icon:hover { background: var(--bg-interactive-hover); color: var(--text-default); }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 640px) {
  .sub-form-grid { grid-template-columns: 1fr; }
}
</style>
