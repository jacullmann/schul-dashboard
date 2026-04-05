<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { RefreshCw, Trash2, Settings2, Plus, Minus } from '@lucide/vue';
import InfoModal from '@/common/components/InfoModal.vue';
import AdminSchedule from '@/modules/admin/components/AdminSchedule.vue';
import type { ScheduleSubstitution } from '@/modules/admin/types';
import type { Lesson } from '@/modules/schedule/types';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';

const props = defineProps<{
  subs: ScheduleSubstitution[];
  loadingSubs: boolean;
  lessons: Lesson[];
  loadingLessons: boolean;
  savingSub: boolean;
  savingScheduleConfig: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'save-sub', payload: Record<string, unknown>): void;
  (e: 'delete-sub', id: string): void;
  (e: 'update-schedule-config', payload: Record<string, any>): void;
}>();

const { activeScheduleConfig } = useAppAuth();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.tenantRole === 'admin');

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

const configForm = ref({
  startTime: '08:00',
  totalSlots: 9,
  lessonDurationMins: 45,
  breaks: {} as Record<number, number>
});

watch(activeScheduleConfig, (newConfig) => {
  if (newConfig) {
    configForm.value = {
      startTime: newConfig.startTime ?? '08:00',
      totalSlots: newConfig.totalSlots ?? 9,
      lessonDurationMins: newConfig.lessonDurationMins ?? 45,
      breaks: { ...(newConfig.breaks || {}) }
    };
  }
}, { immediate: true, deep: true });

function addBreak() {
  const maxSlot = configForm.value.totalSlots;
  for (let i = 1; i <= maxSlot; i++) {
    if (!(i in configForm.value.breaks)) {
      configForm.value.breaks[i] = 10;
      break;
    }
  }
}

function removeBreak(slotStr: string | number) {
  const slot = Number(slotStr);
  const newBreaks = { ...configForm.value.breaks };
  delete newBreaks[slot];
  configForm.value.breaks = newBreaks;
}

function handleSaveConfig() {
  emit('update-schedule-config', {
    startTime: configForm.value.startTime,
    totalSlots: configForm.value.totalSlots,
    lessonDurationMins: configForm.value.lessonDurationMins,
    breaks: configForm.value.breaks
  });
}

const selectedLesson = ref<Lesson | null>(null);

function getDisplayName(lesson: Lesson): string {
  const subjectName =
    lesson.subjects?.name || lesson.subject || lesson.subjectAbbr || '';
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
  if (subForm.value.duration !== null)
    payload.duration = subForm.value.duration;
  if (subForm.value.day !== null) payload.day = subForm.value.day;
  if (subForm.value.cancelled) payload.cancelled = true;
  if (subForm.value.hide) payload.hide = true;

  emit('save-sub', payload);
  subForm.value = {
    lessonId: '',
    subject: '',
    room: '',
    slot: null,
    duration: null,
    day: null,
    cancelled: false,
    hide: false,
  };
  selectedLesson.value = null;
}
</script>

<template>
  <div class="tab-panel">
    <PageHeader>
      Stundenplanänderungen

      <template #info>
        <InfoModal
          tooltip="Übersicht des Adminstundenplanmenüs"
          title="Stundenplanänderungen"
        >
          <h3>Trage Änderungen Live und anschaulich ein</h3>

          <h3>Stunden auswählen</h3>
          <p>
            Klicke in der Stundenplanansicht die Stunden an, die du ändern
            möchtest.
          </p>

          <h3>Änderungen eintragen</h3>
          <p>
            Schreibe in die passenden Textfelder die neuen Daten. Falls ein Wert
            gleichbleiben soll, kannst du das Feld freilassen. Mit den
            entsprechenden Checkboxen kannst du auch markieren ob Stunden
            ausfallen oder Stunden ganz verbergen.
          </p>
        </InfoModal>
      </template>

      <template #action>
        <BaseTooltip content="Aktualisieren">
          <BaseButton
            @click="emit('refresh')"
            :disabled="loadingSubs"
            variant="ghost"
            on="canvas"
            :icon="RefreshCw"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <!-- Create Form -->
    <h3
      v-if="!selectedLesson"
      style="color: var(--color-on-surface-muted); margin-bottom: 24px"
    >
      Bitte wählen Sie eine Stunde aus dem Stundenplan.
    </h3>

    <div v-if="selectedLesson">
      <h3
        style="margin-top: 0; margin-bottom: 8px; font-size: var(--text-title)"
      >
        Ausgewählte Stunde
      </h3>
      <p
        style="
          margin: 0 0 16px 0;
          color: var(--color-on-surface-muted);
          font-size: var(--text-body);
        "
      >
        Ersetzt: <strong>{{ getDisplayName(selectedLesson) }}</strong> (Stunde:
        {{ selectedLesson.slot }}, Letzte Stunde:
        {{ selectedLesson.slot + selectedLesson.duration - 1 }}, Raum:
        {{ selectedLesson.room || '-' }}, Tag: {{ selectedLesson.day }})
      </p>

      <div class="sub-form-grid">
        <input type="hidden" v-model="subForm.lessonId" />
        <div class="form-field">
          <BaseLabel for="sub-subject">Neues Fach</BaseLabel>
          <BaseInput
            id="sub-subject"
            v-model="subForm.subject"
            placeholder="Deutsch"
          />
        </div>
        <div class="form-field">
          <BaseLabel for="sub-room">Neuer Raum</BaseLabel>
          <BaseInput id="sub-room" v-model="subForm.room" placeholder="A101" />
        </div>
        <div class="form-field">
          <BaseLabel for="sub-slot">Neue Stunde</BaseLabel>
          <BaseInput
            id="sub-slot"
            v-model.number="subForm.slot"
            type="number"
            placeholder="4"
          />
        </div>
        <div class="form-field">
          <BaseLabel for="sub-duration">Neue Dauer</BaseLabel>
          <BaseInput
            id="sub-duration"
            v-model.number="subForm.duration"
            type="number"
            min="1"
            placeholder="2"
          />
        </div>
        <div class="form-field">
          <BaseLabel for="sub-day">Neuer Tag (1 = Mo, 5 = Fr)</BaseLabel>
          <BaseInput
            id="sub-day"
            v-model.number="subForm.day"
            type="number"
            min="1"
            max="5"
            placeholder="2"
          />
        </div>
      </div>

      <div class="flex gap-6 mt-4 mb-6">
        <BaseCheckbox v-model="subForm.cancelled">
          <span>Ausfall</span>
        </BaseCheckbox>
        <BaseCheckbox v-model="subForm.hide">
          <span>Verstecken</span>
        </BaseCheckbox>
      </div>

      <BaseButton
        @click="handleSaveSub"
        :disabled="savingSub || !subForm.lessonId"
        variant="action"
      >
        {{ savingSub ? 'Speichert...' : 'Speichern' }}
      </BaseButton>
    </div>

    <h3 style="padding: 20px 20px 0 20px; font-size: var(--text-title)">
      Stunde auswählen
    </h3>
    <div v-if="loadingLessons" class="empty-hint">Lade Stundenplan...</div>
    <AdminSchedule
      v-else
      :lessons="lessons"
      :selectedLessonId="subForm.lessonId"
      @select-lesson="onLessonSelected"
      style="padding: 20px"
    />

    <!-- Existing Subs -->
    <div v-if="subs.length === 0 && !loadingSubs" class="empty-hint">
      Keine Substitutions vorhanden.
    </div>
    <div v-else class="subs-list">
      <div v-for="sub in subs" :key="sub.id" class="sub-row">
        <div class="sub-row-info">
          <span v-if="sub.subject" class="sub-row-tag">{{ sub.subject }}</span>
          <span v-else class="sub-row-tag">Unbekannt</span>
          <span class="sub-row-detail" v-if="sub.slot"
            >Stunde: {{ sub.slot }}</span
          >
          <span class="sub-row-detail" v-if="sub.day">Tag: {{ sub.day }}</span>
          <span v-if="sub.cancelled" class="sub-row-tag danger">Ausfall</span>
          <span v-if="sub.hide" class="sub-row-tag muted">Versteckt</span>
          <span v-if="sub.room" class="sub-row-detail"
            >Raum: {{ sub.room }}</span
          >
        </div>
        <button
          class="btn-icon danger"
          @click="emit('delete-sub', sub.id)"
          title="Löschen"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>

    <!-- Config section -->
    <div class="mt-8 border-t border-surface-border pt-6">
      <h3 style="font-size: var(--text-title); display: flex; align-items: center; gap: 8px; margin-top: 0;">
        <Settings2 :size="20" />
        Stundenplan Konfiguration
      </h3>
      <p style="color: var(--color-on-surface-muted); margin-bottom: 24px; font-size: var(--text-sub);">
        Konfiguriere die globalen Einstellungen für den Stundenplan (Zeiten, Pausen).
      </p>

      <div class="sub-form-grid">
        <div class="form-field">
          <BaseLabel for="config-start">Startzeit</BaseLabel>
          <BaseInput
            id="config-start"
            type="time"
            v-model="configForm.startTime"
            :disabled="!isAdmin"
          />
        </div>
        <div class="form-field">
          <BaseLabel for="config-slots">Anzahl Stunden (Pro Tag)</BaseLabel>
          <BaseInput
            id="config-slots"
            type="number"
            min="1"
            max="15"
            v-model.number="configForm.totalSlots"
            :disabled="!isAdmin"
          />
        </div>
        <div class="form-field">
          <BaseLabel for="config-duration">Stundenlänge (Minuten)</BaseLabel>
          <BaseInput
            id="config-duration"
            type="number"
            min="10"
            max="120"
            v-model.number="configForm.lessonDurationMins"
            :disabled="!isAdmin"
          />
        </div>
      </div>

      <div class="mt-6 mb-4">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <BaseLabel style="margin: 0; font-size: var(--text-body);">Pausen</BaseLabel>
          <BaseButton v-if="isAdmin" variant="ghost" @click="addBreak" :icon="Plus" size="sm">
            Pause hinzufügen
          </BaseButton>
        </div>
        
        <div v-if="Object.keys(configForm.breaks).length === 0" class="empty-hint" style="padding: 16px;">
          Keine Pausen konfiguriert.
        </div>
        
        <div class="flex flex-col gap-2">
          <div v-for="(duration, slot) in configForm.breaks" :key="slot" class="flex gap-2 items-end">
            <div class="form-field flex-1" style="margin: 0;">
              <BaseLabel :for="`break-slot-${slot}`">Nach Stunde</BaseLabel>
              <BaseInput
                :id="`break-slot-${slot}`"
                type="number"
                min="1"
                :max="configForm.totalSlots"
                :value="slot"
                :disabled="!isAdmin"
                @change="e => {
                  if (!isAdmin) return;
                  const newSlot = Number((e.target as HTMLInputElement).value);
                  const breaks = { ...configForm.breaks };
                  const val = breaks[Number(slot)];
                  delete breaks[Number(slot)];
                  breaks[newSlot] = val;
                  configForm.breaks = breaks;
                }"
              />
            </div>
            <div class="form-field flex-1" style="margin: 0;">
              <BaseLabel :for="`break-dur-${slot}`">Dauer (Minuten)</BaseLabel>
              <BaseInput
                :id="`break-dur-${slot}`"
                type="number"
                min="1"
                v-model.number="configForm.breaks[Number(slot)]"
                :disabled="!isAdmin"
              />
            </div>
            <BaseButton v-if="isAdmin" variant="ghost" class="text-danger mb-1" @click="removeBreak(slot)">
              <Trash2 :size="20" />
            </BaseButton>
          </div>
        </div>
      </div>

      <div v-if="isAdmin" class="mt-6">
        <BaseButton @click="handleSaveConfig" :disabled="savingScheduleConfig" variant="action">
          {{ savingScheduleConfig ? 'Speichert...' : 'Konfiguration Speichern' }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-panel {
  animation: fadeUp 0.2s ease;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  margin-bottom: 4px;
  font-weight: 500;
}

.checkbox-field label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-body);
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
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
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
  background: var(--color-surface-hover);
  color: var(--color-on-surface);
}

.sub-row-tag.danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.sub-row-tag.muted {
  background: var(--color-surface-hover);
  color: var(--color-on-surface-muted);
}

.sub-row-detail {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--color-on-surface-muted);
  font-size: var(--text-body);
}

.spin-icon {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-on-surface-muted);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-icon:hover {
  background: var(--color-surface-hover);
  color: var(--color-on-surface);
}
.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .sub-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
