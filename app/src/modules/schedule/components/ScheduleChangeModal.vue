<script setup lang="ts">
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Lesson, Substitution } from '@/modules/schedule/types';
import { useScheduleChangeForm } from '@/modules/schedule/composables/useScheduleChangeForm';

const props = defineProps<{
  /** The lesson as the weekly schedule holds it, before any change. */
  lesson: Lesson | null;
  /** The change the lesson already carries, which saving replaces. */
  change: Substitution | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const { t } = useI18n();

const {
  form,
  saving,
  canRescheduleLessons,
  lessonSubjectName,
  courseOptions,
  dayOptions,
  day,
  canSave,
  toggleCancelled,
  saveChange,
  formatDayName,
} = useScheduleChangeForm(toRef(props, 'lesson'), toRef(props, 'change'));

async function submit() {
  if (await saveChange()) emit('saved');
}
</script>

<template>
  <BaseModal
    :open="!!lesson"
    :submit="submit"
    :loading="saving"
    :requirement="canSave"
    header-actions
    @cancel="emit('close')"
  >
    <template #title>
      {{ t('groups.settings.schedule.changes.edit_lesson_title') }}
    </template>

    <template #content>
      <i18n-t
        :keypath="
          lesson?.room
            ? 'groups.settings.schedule.changes.editing_summary'
            : 'groups.settings.schedule.changes.editing_summary_no_room'
        "
        tag="div"
        class="text-base text-on-ghost-muted"
      >
        <template #subject>
          <strong>{{ lessonSubjectName }}</strong>
        </template>
        <template #room>
          <strong>{{ lesson?.room }}</strong>
        </template>
        <template #day>
          {{ lesson ? formatDayName(lesson.day) : '' }}
        </template>
      </i18n-t>

      <button
        type="button"
        role="switch"
        :aria-checked="form.cancelled"
        class="relative group flex items-center justify-between w-full h-10 cursor-pointer touch-target after:min-h-12"
        @click="toggleCancelled"
      >
        <span class="text-base font-normal">{{
          t('groups.settings.schedule.changes.cancelled_label')
        }}</span>
        <BaseToggle :model-value="form.cancelled" decorative />
      </button>

      <BaseFormGroup v-if="courseOptions.length > 1" id="change-course">
        <BaseLabel for="change-course-select">{{
          t('groups.settings.schedule.changes.affected_course_label')
        }}</BaseLabel>
        <BaseSelect
          id="change-course-select"
          v-model="form.courseId"
          :options="courseOptions"
          classes="w-full"
        />
      </BaseFormGroup>

      <!-- A cancelled lesson shows nothing else, so its other changes fold
           away; they keep what was typed in case it is turned off again.
           The negative margin takes back the form's gap while collapsed. -->
      <div
        class="grid -mt-4 transition-[grid-template-rows,opacity] duration-300 ease-out"
        :class="
          form.cancelled
            ? 'grid-rows-[0fr] opacity-0'
            : 'grid-rows-[1fr] opacity-100'
        "
        :inert="form.cancelled"
      >
        <div class="overflow-hidden min-h-0">
          <div class="flex flex-col gap-4 pt-4">
            <BaseFormGroup v-if="canRescheduleLessons" id="change-subject">
              <BaseLabel for="change-subject-input">{{
                t('groups.settings.schedule.changes.new_subject_label')
              }}</BaseLabel>
              <BaseInput id="change-subject-input" v-model="form.subject" />
            </BaseFormGroup>

            <BaseFormGroup id="change-room">
              <BaseLabel for="change-room-input">{{
                t('groups.settings.schedule.changes.new_room_label')
              }}</BaseLabel>
              <BaseInput id="change-room-input" v-model="form.room" />
            </BaseFormGroup>

            <template v-if="canRescheduleLessons">
              <BaseFormGroup id="change-slot">
                <BaseLabel for="change-slot-input">{{
                  t('groups.settings.schedule.changes.new_slot_label')
                }}</BaseLabel>
                <BaseInput
                  id="change-slot-input"
                  v-model.number="form.slot"
                  type="number"
                  min="1"
                  :placeholder="String(lesson?.slot ?? '')"
                />
              </BaseFormGroup>

              <BaseFormGroup id="change-duration">
                <BaseLabel for="change-duration-input">{{
                  t('groups.settings.schedule.changes.new_duration_label')
                }}</BaseLabel>
                <BaseInput
                  id="change-duration-input"
                  v-model.number="form.duration"
                  type="number"
                  min="1"
                  :placeholder="String(lesson?.duration ?? 1)"
                />
              </BaseFormGroup>

              <BaseFormGroup id="change-day">
                <BaseLabel for="change-day-select">{{
                  t('groups.settings.schedule.changes.new_day_label')
                }}</BaseLabel>
                <BaseSelect
                  id="change-day-select"
                  v-model="day"
                  :options="dayOptions"
                  classes="w-full"
                />
              </BaseFormGroup>
            </template>
          </div>
        </div>
      </div>
    </template>

    <template #action-text>
      {{ t('common.buttons.save') }}
    </template>
  </BaseModal>
</template>
