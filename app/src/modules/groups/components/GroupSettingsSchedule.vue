<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { RefreshCw, Trash2, Plus } from '@lucide/vue';
import InfoModal from '@/common/components/InfoModal.vue';
import AdminSchedule from '@/modules/groups/components/AdminSchedule.vue';
import type { ScheduleSubstitution } from '@/modules/groups/types';
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

const { activeScheduleConfig, checkPermission } = useAppAuth();
const userStore = useUserStore();
const isAdmin = computed(
  () =>
    userStore.user?.tenantRole === 'admin' ||
    userStore.user?.role === 'superadmin',
);

const canEditScheduleConfig = computed(() => checkPermission('edit_schedule'));
const canManageScheduleChanges = computed(() =>
  checkPermission('manage_schedule_changes'),
);

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
  <div class="animate-fade-up">
    <PageHeader>
      Stundenplan
      <template #info>
        <InfoModal
          tooltip="t('groups.settings.schedule.info.tooltip')"
          title="Stundenplaneinstellungen"
        >
          <h3>
            {{ t('groups.settings.schedule.config.instruction_text') }}
          </h3>
        </InfoModal>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-1">
      <div>
        <BaseLabel for="config-start">Startzeit</BaseLabel>
        <BaseInput
          id="config-start"
          v-model="configForm.startTime"
          type="time"
          :disabled="!canEditScheduleConfig"
        />
      </div>
      <div>
        <BaseLabel for="config-slots">Anzahl Stunden (Pro Tag)</BaseLabel>
        <BaseInput
          id="config-slots"
          v-model.number="configForm.totalSlots"
          type="number"
          min="1"
          max="15"
          :disabled="!canEditScheduleConfig"
        />
      </div>
      <div>
        <BaseLabel for="config-duration">{{
          t('groups.settings.schedule.config.lesson_duration_label')
        }}</BaseLabel>
        <BaseInput
          id="config-duration"
          v-model.number="configForm.lessonDurationMins"
          type="number"
          min="10"
          max="120"
          :disabled="!canEditScheduleConfig"
        />
      </div>
    </div>

    <div class="mt-6 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3>{{ t('groups.settings.schedule.config.breaks_title') }}</h3>
        <BaseButton
          v-if="canEditScheduleConfig"
          variant="ghost"
          :icon="Plus"
          @click="addBreak"
        >
          {{ t('groups.settings.schedule.config.add_break_button') }}
        </BaseButton>
      </div>

      <div
        v-if="configForm.breaks.length === 0"
        class="text-center p-4 text-on-ghost-muted text-base"
      >
        {{ t('groups.settings.schedule.config.no_breaks') }}
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="brk in sortedBreaks"
          :key="brk.id"
          class="flex gap-2 items-end"
        >
          <div class="form-field flex-1 m-0">
            <BaseLabel :for="`break-slot-${brk.id}`">{{
              t('groups.settings.schedule.config.after_lesson_label')
            }}</BaseLabel>
            <BaseInput
              :id="`break-slot-${brk.id}`"
              v-model.number="brk.slot"
              type="number"
              min="1"
              :max="configForm.totalSlots"
              :disabled="!canEditScheduleConfig"
            />
          </div>
          <div class="form-field flex-1 m-0">
            <BaseLabel :for="`break-dur-${brk.id}`">{{
              t('groups.settings.schedule.config.break_duration_label')
            }}</BaseLabel>
            <BaseInput
              :id="`break-dur-${brk.id}`"
              v-model.number="brk.duration"
              type="number"
              min="1"
              :disabled="!canEditScheduleConfig"
            />
          </div>
          <BaseButton
            v-if="canEditScheduleConfig"
            variant="ghost"
            class="text-danger mb-1"
            :icon="Trash2"
            @click="removeBreak(brk.id)"
          />
        </div>
      </div>
    </div>

    <div v-if="canEditScheduleConfig" class="mt-6">
      <BaseButton
        :disabled="savingScheduleConfig"
        variant="action"
        @click="handleSaveConfig"
      >
        {{
          savingScheduleConfig
            ? t('common.buttons.saving')
            : t('groups.settings.schedule.config.save_button')
        }}
      </BaseButton>
    </div>
    <div class="mt-8 border-t border-surface-border pt-6">
      <PageHeader>
        {{ t('groups.settings.schedule.changes.title') }}

        <template #info>
          <InfoModal
            tooltip="t('groups.settings.schedule.changes.tooltip')"
            title="t('groups.settings.schedule.changes.title')"
          >
            <h3>{{ t('groups.settings.schedule.changes.headline') }}</h3>

            <h3>{{ t('groups.settings.schedule.changes.select_lessons') }}</h3>
            <p>
              {{ t('groups.settings.schedule.changes.select_instruction') }}
            </p>

            <h3>{{ t('groups.settings.schedule.changes.submit_changes') }}</h3>
            <p>
              {{ t('groups.settings.schedule.changes.submit_instruction') }}
            </p>
          </InfoModal>
        </template>

        <template #action>
          <BaseTooltip content="Aktualisieren">
            <BaseButton
              :disabled="loadingSubs"
              variant="ghost"
              :icon="RefreshCw"
              @click="emit('refresh')"
            />
          </BaseTooltip>
        </template>
      </PageHeader>

      <h3 v-if="!selectedLesson" class="text-on-ghost-muted mb-6">
        {{ t('groups.settings.schedule.changes.select_lesson_warning') }}
      </h3>

      <div v-if="selectedLesson">
        <h3 class="mt-0 mb-2 text-lg">
          {{ t('groups.settings.schedule.changes.selected_lesson') }}
        </h3>
        <p class="m-0 mb-4 text-on-ghost-muted text-base">
          {{ t('groups.settings.schedule.changes.replaces_prefix') }}
          <strong>{{ getDisplayName(selectedLesson) }}</strong> ({{
            t('groups.settings.schedule.changes.lesson_label')
          }}
          {{ selectedLesson.slot }},
          {{ t('groups.settings.schedule.changes.last_lesson_label') }}
          {{ selectedLesson.slot + selectedLesson.duration - 1 }},
          {{ t('groups.settings.schedule.changes.room_label') }}
          {{ selectedLesson.room || '-' }},
          {{ t('groups.settings.schedule.changes.day_label') }} {{ selectedLesson.day }})
        </p>

        <div class="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-1">
          <input v-model="subForm.lessonId" type="hidden" />
          <div class="form-field">
            <BaseLabel for="sub-subject">{{
              t('groups.settings.schedule.changes.new_subject_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-subject"
              v-model="subForm.subject"
              placeholder="Deutsch"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-room">{{
              t('groups.settings.schedule.changes.new_room_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-room"
              v-model="subForm.room"
              placeholder="A101"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-slot">{{
              t('groups.settings.schedule.changes.new_slot_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-slot"
              v-model.number="subForm.slot"
              type="number"
              placeholder="4"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-duration">{{
              t('groups.settings.schedule.changes.new_duration_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-duration"
              v-model.number="subForm.duration"
              type="number"
              min="1"
              placeholder="2"
              :disabled="!canManageScheduleChanges"
            />
          </div>
          <div class="form-field">
            <BaseLabel for="sub-day">{{
              t('groups.settings.schedule.changes.new_day_label')
            }}</BaseLabel>
            <BaseInput
              id="sub-day"
              v-model.number="subForm.day"
              type="number"
              min="1"
              max="5"
              placeholder="2"
              :disabled="!canManageScheduleChanges"
            />
          </div>
        </div>

        <div class="flex gap-6 mt-4 mb-6">
          <BaseCheckbox
            v-model="subForm.cancelled"
            :disabled="!canManageScheduleChanges"
          >
            <span>{{ t('groups.settings.schedule.changes.cancelled_label') }}</span>
          </BaseCheckbox>
          <BaseCheckbox
            v-model="subForm.hide"
            :disabled="!canManageScheduleChanges"
          >
            <span>{{ t('groups.settings.schedule.changes.hide_label') }}</span>
          </BaseCheckbox>
        </div>

        <BaseButton
          :disabled="
            savingSub || !subForm.lessonId || !canManageScheduleChanges
          "
          variant="action"
          @click="handleSaveSub"
        >
          {{
            savingSub ? t('common.buttons.saving') : t('common.buttons.save')
          }}
        </BaseButton>
      </div>

      <h3 class="p-5 pb-0 text-lg">
        {{ t('groups.settings.schedule.changes.select_lesson_slot') }}
      </h3>
      <div
        v-if="loadingLessons"
        class="text-center p-8 text-on-ghost-muted text-base"
      >
        Lade Stundenplan...
      </div>
      <AdminSchedule
        v-else
        :lessons="lessons"
        :selected-lesson-id="subForm.lessonId"
        class="p-5"
        @select-lesson="onLessonSelected"
      />

      <div
        v-if="subs.length === 0 && !loadingSubs"
        class="text-center p-8 text-on-ghost-muted text-base"
      >
        {{ t('groups.settings.schedule.changes.no_changes') }}
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
              class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-surface-hover text-on-ghost"
              >{{ sub.subject }}</span
            >
            <span
              v-else
              class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-surface-hover text-on-ghost"
              >Unbekannt</span
            >
            <span v-if="sub.slot" class="text-sm text-on-ghost-muted"
              >Stunde: {{ sub.slot }}</span
            >
            <span v-if="sub.day" class="text-sm text-on-ghost-muted"
              >Tag: {{ sub.day }}</span
            >
            <span
              v-if="sub.cancelled"
              class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
              >Ausfall</span
            >
            <span
              v-if="sub.hide"
              class="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-surface-hover text-on-ghost-muted"
              >Versteckt</span
            >
            <span v-if="sub.room" class="text-sm text-on-ghost-muted"
              >Raum: {{ sub.room }}</span
            >
          </div>
          <BaseTooltip :content="t('common.buttons.delete')" placement="bottom">
            <BaseButton
              :disabled="!canManageScheduleChanges"
              variant="ghost"
              :icon="Trash2"
              @click="emit('delete-sub', sub.id)"
            />
          </BaseTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
