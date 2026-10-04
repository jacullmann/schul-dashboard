<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Pencil, Plus, Trash2 } from '@lucide/vue';
import type { ScheduleConfig } from '@/modules/schedule/types';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';
import { DEFAULT_SCHEDULE_CONFIG } from '@/modules/schedule/utils/slotTimes';

const props = defineProps<{
  canEdit: boolean;
  saving: boolean;
  save: (config: ScheduleConfig) => Promise<boolean>;
}>();

const isEditing = defineModel<boolean>('editing', { default: false });

const { t } = useI18n();
const { scheduleConfig } = useScheduleDisplay();

let breakSequence = 0;

const configFormOf = (config: ScheduleConfig) => ({
  startTime: config.startTime,
  totalSlots: config.totalSlots,
  lessonDurationMins: config.lessonDurationMins,
  breaks: Object.entries(config.breaks).map(([slot, duration]) => ({
    id: ++breakSequence,
    slot: Number(slot),
    duration: Number(duration),
  })),
});

const form = ref(configFormOf(scheduleConfig.value));

/** The form as the server stores it, with a blank duration read as the default. */
const draftConfig = computed<ScheduleConfig>(() => ({
  startTime: form.value.startTime,
  totalSlots: form.value.totalSlots,
  lessonDurationMins:
    Number(form.value.lessonDurationMins) ||
    DEFAULT_SCHEDULE_CONFIG.lessonDurationMins,
  breaks: Object.fromEntries(
    form.value.breaks
      .filter((brk) => brk.slot)
      .map((brk) => [brk.slot, Number(brk.duration || 0)]),
  ),
}));

const savedBreaks = computed(() =>
  Object.entries(scheduleConfig.value.breaks)
    .map(([slot, minutes]) => ({ slot: Number(slot), minutes }))
    .sort((a, b) => a.slot - b.slot),
);

const sortedFormBreaks = computed(() =>
  [...form.value.breaks].sort((a, b) => a.slot - b.slot),
);

function startEditing() {
  if (!props.canEdit) return;
  form.value = configFormOf(scheduleConfig.value);
  isEditing.value = true;
}

function stopEditing() {
  isEditing.value = false;
}

async function submit() {
  if (await props.save(draftConfig.value)) stopEditing();
}

function addBreak() {
  const takenSlots = new Set(form.value.breaks.map((brk) => brk.slot));
  for (let slot = 1; slot <= form.value.totalSlots; slot++) {
    if (!takenSlots.has(slot)) {
      form.value.breaks.push({ id: ++breakSequence, slot, duration: 10 });
      return;
    }
  }
}

function removeBreak(id: number) {
  form.value.breaks = form.value.breaks.filter((brk) => brk.id !== id);
}
</script>

<template>
  <div>
    <PageHeader>
      {{ t('groups.settings.schedule.config.title') }}

      <template #action>
        <BaseTooltip
          v-if="canEdit && !isEditing"
          :content="t('groups.settings.schedule.config.edit_button')"
          placement="bottom"
        >
          <BaseButton variant="ghost" :icon="Pencil" @click="startEditing" />
        </BaseTooltip>
      </template>
    </PageHeader>

    <BaseFormContent v-if="isEditing" class="max-w-120">
      <BaseFormGroup id="config-start">
        <BaseLabel for="config-start-input">{{
          t('groups.settings.schedule.config.start_time_label')
        }}</BaseLabel>
        <BaseInput
          id="config-start-input"
          v-model="form.startTime"
          type="time"
        />
      </BaseFormGroup>
      <BaseFormGroup id="config-slots">
        <BaseLabel for="config-slots-input">{{
          t('groups.settings.schedule.config.slots_per_day_label')
        }}</BaseLabel>
        <BaseInput
          id="config-slots-input"
          v-model.number="form.totalSlots"
          type="number"
          min="1"
          max="15"
        />
      </BaseFormGroup>
      <BaseFormGroup id="config-duration">
        <BaseLabel for="config-duration-input">{{
          t('groups.settings.schedule.config.lesson_duration_label')
        }}</BaseLabel>
        <BaseInput
          id="config-duration-input"
          v-model.number="form.lessonDurationMins"
          type="number"
          min="10"
          max="120"
        />
      </BaseFormGroup>

      <div class="pt-4 border-t border-ghost-border">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-on-ghost">{{
            t('groups.settings.schedule.config.breaks_title')
          }}</span>
          <BaseButton variant="ghost" :icon="Plus" @click="addBreak">
            {{ t('groups.settings.schedule.config.add_break_button') }}
          </BaseButton>
        </div>

        <div
          v-if="form.breaks.length === 0"
          class="text-center py-2 text-on-ghost-muted text-xs italic"
        >
          {{ t('groups.settings.schedule.config.no_breaks') }}
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="brk in sortedFormBreaks"
            :key="brk.id"
            class="flex gap-2 items-end"
          >
            <div class="form-field flex-1 m-0">
              <BaseLabel :for="`break-slot-${brk.id}`" class="text-xs">{{
                t('groups.settings.schedule.config.after_lesson_label')
              }}</BaseLabel>
              <BaseInput
                :id="`break-slot-${brk.id}`"
                v-model.number="brk.slot"
                type="number"
                min="1"
                :max="form.totalSlots"
              />
            </div>
            <div class="form-field flex-1 m-0">
              <BaseLabel :for="`break-dur-${brk.id}`" class="text-xs">{{
                t('groups.settings.schedule.config.break_duration_label')
              }}</BaseLabel>
              <BaseInput
                :id="`break-dur-${brk.id}`"
                v-model.number="brk.duration"
                type="number"
                min="1"
              />
            </div>
            <BaseButton
              variant="ghost"
              class="text-danger mb-1"
              :icon="Trash2"
              @click="removeBreak(brk.id)"
            />
          </div>
        </div>
      </div>

      <BaseRow stack-on-mobile justify="end" class="w-full mt-2 gap-2">
        <BaseButton form variant="ghost" @click="stopEditing">
          {{ t('common.buttons.cancel') }}
        </BaseButton>
        <BaseButton form variant="action" :disabled="saving" @click="submit">
          {{ saving ? t('common.buttons.saving') : t('common.buttons.save') }}
        </BaseButton>
      </BaseRow>
    </BaseFormContent>

    <dl
      v-else
      class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 m-0 text-base max-w-120"
    >
      <dt class="text-on-ghost-muted">
        {{ t('groups.settings.schedule.config.start_time_label') }}
      </dt>
      <dd class="m-0 text-on-ghost">{{ scheduleConfig.startTime }}</dd>

      <dt class="text-on-ghost-muted">
        {{ t('groups.settings.schedule.config.slots_per_day_label') }}
      </dt>
      <dd class="m-0 text-on-ghost">{{ scheduleConfig.totalSlots }}</dd>

      <dt class="text-on-ghost-muted">
        {{ t('groups.settings.schedule.config.lesson_duration_label') }}
      </dt>
      <dd class="m-0 text-on-ghost">
        {{ scheduleConfig.lessonDurationMins }}
      </dd>

      <dt class="text-on-ghost-muted">
        {{ t('groups.settings.schedule.config.breaks_title') }}
      </dt>
      <dd class="m-0 text-on-ghost">
        <ul v-if="savedBreaks.length" class="m-0 p-0 list-none">
          <li v-for="brk in savedBreaks" :key="brk.slot">
            {{ t('groups.settings.schedule.config.break_summary', brk) }}
          </li>
        </ul>
        <span v-else class="text-on-ghost-muted">
          {{ t('groups.settings.schedule.config.no_breaks') }}
        </span>
      </dd>
    </dl>
  </div>
</template>
