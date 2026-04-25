<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { RefreshCw, Trash2, Plus } from '@lucide/vue';
import InfoModal from '@/common/components/InfoModal.vue';
import AdminSchedule from '@/modules/admin/components/AdminSchedule.vue';
import type { ScheduleSubstitution } from '@/modules/admin/types';
import type { Lesson } from '@/modules/schedule/types';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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
  breaks: [] as { id: string; slot: number; duration: number }[],
});

const sortedBreaks = computed(() => {
  return [...configForm.value.breaks].sort((a, b) => a.slot - b.slot);
});

watch(
  activeScheduleConfig,
  (newConfig) => {
    if (newConfig) {
      configForm.value = {
        startTime: newConfig.startTime ?? '08:00',
        totalSlots: newConfig.totalSlots ?? 9,
        lessonDurationMins: newConfig.lessonDurationMins ?? 45,
        breaks: Object.entries(newConfig.breaks || {}).map(
          ([slot, duration]) => ({
            id: Math.random().toString(36).substring(2, 9),
            slot: Number(slot),
            duration: Number(duration),
          }),
        ),
      };
    }
  },
  { immediate: true, deep: true },
);

function addBreak() {
  const maxSlot = configForm.value.totalSlots;
  const existingSlots = configForm.value.breaks.map((b) => b.slot);
  for (let i = 1; i <= maxSlot; i++) {
    if (!existingSlots.includes(i)) {
      configForm.value.breaks.push({
        id: Math.random().toString(36).substring(2, 9),
        slot: i,
        duration: 10,
      });
      break;
    }
  }
}

function removeBreak(id: string) {
  configForm.value.breaks = configForm.value.breaks.filter((b) => b.id !== id);
}

function handleSaveConfig() {
  const breaksObj: Record<number, number> = {};
  configForm.value.breaks.forEach((b) => {
    if (b.slot) {
      breaksObj[b.slot] = b.duration || 0;
    }
  });

  emit('update-schedule-config', {
    startTime: configForm.value.startTime,
    totalSlots: configForm.value.totalSlots,
    lessonDurationMins: configForm.value.lessonDurationMins,
    breaks: breaksObj,
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
          tooltip="Übersicht des Stundenplanänderungsmenüs"
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
            :icon="RefreshCw"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <!-- Create Form -->
    <h3 v-if="!selectedLesson" class="text-on-surface-muted mb-6">
      Bitte wählen Sie eine Stunde aus dem Stundenplan.
    </h3>

    <div v-if="selectedLesson">
      <h3 class="mt-0 mb-2 text-title">Ausgewählte Stunde</h3>
      <p class="m-0 mb-4 text-on-surface-muted text-body">
        Ersetzt: <strong>{{ getDisplayName(selectedLesson) }}</strong> (Stunde:
        {{ selectedLesson.slot }}, Letzte Stunde:
        {{ selectedLesson.slot + selectedLesson.duration - 1 }}, Raum:
        {{ selectedLesson.room || '-' }}, Tag: {{ selectedLesson.day }})
      </p>

      <div class="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-1">
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

    <h3 class="p-5 pb-0 text-title">Stunde auswählen</h3>
    <div
      v-if="loadingLessons"
      class="text-center p-8 text-on-surface-muted text-body"
    >
      Lade Stundenplan...
    </div>
    <AdminSchedule
      v-else
      :lessons="lessons"
      :selectedLessonId="subForm.lessonId"
      @select-lesson="onLessonSelected"
      class="p-5"
    />

    <!-- Existing Subs -->
    <div
      v-if="subs.length === 0 && !loadingSubs"
      class="text-center p-8 text-on-surface-muted text-body"
    >
      Keine Substitutions vorhanden.
    </div>
    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="sub in subs"
        :key="sub.id"
        class="flex items-center justify-between p-2 px-3.5 bg-surface border border-surface-border shadow-input rounded-[10px] gap-2"
      >
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <span
            v-if="sub.subject"
            class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-surface-hover text-on-surface"
            >{{ sub.subject }}</span
          >
          <span
            v-else
            class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-surface-hover text-on-surface"
            >Unbekannt</span
          >
          <span class="text-sub text-on-surface-muted" v-if="sub.slot"
            >Stunde: {{ sub.slot }}</span
          >
          <span class="text-sub text-on-surface-muted" v-if="sub.day"
            >Tag: {{ sub.day }}</span
          >
          <span
            v-if="sub.cancelled"
            class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
            >Ausfall</span
          >
          <span
            v-if="sub.hide"
            class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-surface-hover text-on-surface-muted"
            >Versteckt</span
          >
          <span v-if="sub.room" class="text-sub text-on-surface-muted"
            >Raum: {{ sub.room }}</span
          >
        </div>
        <BaseTooltip :content="t('global.buttons.delete')" placement="bottom">
          <BaseButton
            @click="emit('delete-sub', sub.id)"
            variant="ghost"
            :icon="Trash2"
          />
        </BaseTooltip>
      </div>
    </div>

    <!-- Config section -->
    <div class="mt-8 border-t border-surface-border pt-6">
      <PageHeader>
        Stundenplaneinstellungen
        <template #info>
          <InfoModal
            tooltip="Übersicht der Stundenplaneinstellungen"
            title="Stundenplaneinstellungen"
          >
            <h3>
              Konfiguriere die globalen Einstellungen für den Stundenplan
              (Zeiten, Pausen).
            </h3>
          </InfoModal>
        </template>
      </PageHeader>

      <div class="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-1">
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
        <div class="flex items-center justify-between mb-3">
          <h3>Pausen</h3>
          <BaseButton
            v-if="isAdmin"
            variant="ghost"
            @click="addBreak"
            :icon="Plus"
            size="sm"
          >
            Pause hinzufügen
          </BaseButton>
        </div>

        <div
          v-if="configForm.breaks.length === 0"
          class="text-center p-4 text-on-surface-muted text-body"
        >
          Keine Pausen konfiguriert.
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="brk in sortedBreaks"
            :key="brk.id"
            class="flex gap-2 items-end"
          >
            <div class="form-field flex-1 m-0">
              <BaseLabel :for="`break-slot-${brk.id}`">Nach Stunde</BaseLabel>
              <BaseInput
                :id="`break-slot-${brk.id}`"
                type="number"
                min="1"
                :max="configForm.totalSlots"
                v-model.number="brk.slot"
                :disabled="!isAdmin"
              />
            </div>
            <div class="form-field flex-1 m-0">
              <BaseLabel :for="`break-dur-${brk.id}`"
                >Dauer (Minuten)</BaseLabel
              >
              <BaseInput
                :id="`break-dur-${brk.id}`"
                type="number"
                min="1"
                v-model.number="brk.duration"
                :disabled="!isAdmin"
              />
            </div>
            <BaseButton
              v-if="isAdmin"
              variant="ghost"
              class="text-danger mb-1"
              @click="removeBreak(brk.id)"
              :icon="Trash2"
            />
          </div>
        </div>
      </div>

      <div v-if="isAdmin" class="mt-6">
        <BaseButton
          @click="handleSaveConfig"
          :disabled="savingScheduleConfig"
          variant="action"
        >
          {{
            savingScheduleConfig ? 'Speichert...' : 'Einstellungen speichern'
          }}
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

.form-field {
  margin-bottom: 16px;
}
</style>
