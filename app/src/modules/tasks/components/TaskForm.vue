<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { fileUrl, isPdf, previewUrl } from '@/api/files';
import type { HwItem } from '@/modules/tasks/composables/useTasks';
import type { ItemType } from '@/modules/tasks/types';
import { X, Upload, FileText } from '@lucide/vue';
import {
  OTHER_SUBJECT,
  useTaskFormLogic,
} from '../composables/useTaskFormLogic';
import { useAddedEntrance } from '../composables/useAddedEntrance';
import { CUSTOM_SUBJECT_MAX_LENGTH } from '@/types/subjects';
import GroupSelect from '@/modules/groups/components/GroupSelect.vue';
import TaskMeta from './TaskMeta.vue';
import TaskPreview from './TaskPreview.vue';

const { t } = useI18n();

const props = defineProps<{
  groupId: string;
  initialType?: Exclude<ItemType, 'all'>;
  initial?: HwItem | null;
  local?: boolean;
  open: boolean;
}>();
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void }>();

const {
  groupId,
  canChooseGroup,
  groupIsFixed,
  targetGroup,
  typeTabItems,
  activeType,
  imgImages,
  imgUploading,
  imgUploadError,
  imageQuotaError,
  pickImages,
  removeImg,
  isDragging,
  dropHandlers,
  canUploadImages,
  canRemoveImage,
  title,
  subjectSel,
  subjectOther,
  description,
  courseSel,
  titleError,
  subjectError,
  courseError,
  subjectOtherError,
  descriptionError,
  dueDateError,
  dueLocal,
  minDateKey,
  maxDateKey,
  submitting,
  submitError,
  subjectOptions,
  selectedSubjectHasCourses,
  courseOptions,
  submit,
  titleInputRef,
  showDoubleTaskConfirm,
  doubleTaskOriginalItem,
  confirmDoubleTaskSubmit,
  viewExisting,
  doubleTaskConfirmMessage,
} = useTaskFormLogic(props.groupId, props.initial, props.initialType, emit);

const imageEntrance = useAddedEntrance(
  computed(() => imgImages.value.map((img) => img.publicId)),
);
</script>

<template>
  <BaseModal
    :open="open"
    :submit="submit"
    :error="submitError"
    :loading="submitting"
    header-actions
    class="outline-2 transition-[outline-color] duration-(--duration-focus) ease-(--ease-focus)"
    :class="isDragging ? 'outline-accent' : 'outline-transparent'"
    v-on="dropHandlers"
    @cancel="emit('cancel')"
  >
    <template #title>
      <span class="flex items-center gap-2 min-w-0">
        <span class="shrink-0">
          {{
            initial
              ? t('tasks.list.task_form.edit_task')
              : t('tasks.list.task_form.new_task')
          }}
        </span>
        <template v-if="canChooseGroup && !local">
          <span
            v-if="groupIsFixed"
            class="max-md:hidden! text-on-ghost-muted font-medium truncate"
          >
            {{ targetGroup?.name }}
          </span>
          <GroupSelect v-else v-model="groupId" permission="create_items" />
        </template>
      </span>
    </template>

    <template #content>
      <!-- Positioned against the dialog, so it lines the whole card. The
           dialog's opaque scroller would hide an inset shadow of its own. -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-40 rounded-2xl inset-shadow-drop-target transition-opacity duration-(--duration-focus) ease-(--ease-focus)"
        :class="isDragging ? 'opacity-100' : 'opacity-0'"
      />

      <BaseFormGroup v-if="!initial" id="type">
        <BaseTabs
          :items="typeTabItems"
          :active-id="activeType"
          @change="(id) => (activeType = id as Exclude<ItemType, 'all'>)"
        />
      </BaseFormGroup>

      <BaseFormGroup id="title" :error="titleError">
        <BaseLabel for="title" required>{{
          t('tasks.list.task_form.title')
        }}</BaseLabel>
        <BaseInput
          id="title"
          ref="titleInputRef"
          v-model="title"
          :aria-describedby="titleError ? 'title-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup id="subject" :error="subjectError">
        <BaseLabel for="subject" required>{{
          t('tasks.list.task_form.subject')
        }}</BaseLabel>
        <BaseSelect
          id="subject"
          v-model="subjectSel"
          :options="subjectOptions"
          :aria-describedby="subjectError ? 'subject-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup
        v-if="selectedSubjectHasCourses"
        id="courseSel"
        :error="courseError"
      >
        <BaseLabel for="courseSel" required>{{
          t('tasks.list.task_form.course')
        }}</BaseLabel>
        <BaseSelect
          id="courseSel"
          v-model="courseSel"
          :options="courseOptions"
          :aria-describedby="courseError ? 'courseSel-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup
        v-if="subjectSel === OTHER_SUBJECT"
        id="subjectOther"
        :error="subjectOtherError"
      >
        <BaseLabel for="subjectOther" required>{{
          t('tasks.list.task_form.custom_subject')
        }}</BaseLabel>
        <BaseInput
          id="subjectOther"
          v-model="subjectOther"
          :maxlength="CUSTOM_SUBJECT_MAX_LENGTH"
          :aria-describedby="
            subjectOtherError ? 'subjectOther-error' : undefined
          "
        />
      </BaseFormGroup>

      <BaseFormGroup id="dueDate" :error="dueDateError">
        <BaseLabel for="dueDate" required>{{
          t('tasks.list.task_form.due_date')
        }}</BaseLabel>
        <BaseDatePicker
          id="dueDate"
          v-model="dueLocal"
          :min="minDateKey"
          :max="maxDateKey"
          :aria-describedby="dueDateError ? 'dueDate-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup id="description" :error="descriptionError">
        <BaseLabel for="description">{{
          t('tasks.list.task_form.description')
        }}</BaseLabel>
        <BaseMarkdownTextarea
          id="description"
          v-model="description"
          rows="4"
          max-rows="8"
          :aria-describedby="descriptionError ? 'description-error' : undefined"
        ></BaseMarkdownTextarea>
      </BaseFormGroup>

      <BaseFormGroup
        v-if="canUploadImages || imgImages.length"
        id="images"
        :error="imageQuotaError || imgUploadError"
      >
        <BaseLabel for="images">{{
          t('tasks.list.task_form.images')
        }}</BaseLabel>
        <BaseRow id="images">
          <div
            v-for="img in imgImages"
            :key="img.id"
            class="relative w-32 h-32 rounded-xl overflow-hidden bg-[rgba(26, 26, 26, 0.5)] backdrop-blur-sm"
            :class="{ 'animate-enter': imageEntrance.isEntering(img.id) }"
            :style="imageEntrance.entranceStyle(img.id)"
            @animationend="imageEntrance.handleEntranceEnd($event, img.id)"
          >
            <BaseLink :to="fileUrl(img)">
              <img
                v-if="previewUrl(img)"
                :src="previewUrl(img) ?? undefined"
                class="block w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                :alt="t('common.preview')"
              />
              <span
                v-else
                class="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-on-ghost"
              >
                <FileText class="h-6 w-6" />
                <span class="text-xs font-bold uppercase">{{
                  img.format
                }}</span>
              </span>
            </BaseLink>

            <div
              v-if="isPdf(img)"
              class="absolute top-1 left-1 flex items-center gap-0.5 bg-black/60 border border-white/10 text-white px-1.5 py-0.5 rounded text-[10px] font-bold select-none pointer-events-none backdrop-blur-sm shadow-sm"
            >
              <FileText class="w-2.5 h-2.5 text-white" />
              <span>PDF</span>
            </div>
            <div v-if="canRemoveImage(img)" class="absolute top-1 right-1">
              <BaseButton
                type="button"
                variant="danger"
                :icon="X"
                size="xs"
                @click="removeImg(img, initial?.id)"
              />
            </div>
          </div>

          <BaseTooltip
            v-if="canUploadImages"
            :content="t('tasks.list.tasks.menu.upload_images')"
            placement="right"
          >
            <BaseButton
              type="button"
              :disabled="imgUploading"
              variant="ghost"
              :loading="imgUploading"
              :icon="Upload"
              @click="pickImages"
            />
          </BaseTooltip>
        </BaseRow>
      </BaseFormGroup>
    </template>

    <template #action-text>
      {{ initial ? t('common.buttons.save') : t('common.buttons.create') }}
    </template>
  </BaseModal>

  <BaseModal
    :open="showDoubleTaskConfirm"
    sheet
    :submit="viewExisting"
    :cancel="confirmDoubleTaskSubmit"
    :loading="submitting"
    @cancel="showDoubleTaskConfirm = false"
  >
    <template #title>
      {{ t('tasks.list.double_task_confirm.title') }}
    </template>

    <template #content>
      <p class="mt-0! mb-4!">
        {{ doubleTaskConfirmMessage }}
      </p>

      <TaskPreview
        v-if="doubleTaskOriginalItem"
        :title="doubleTaskOriginalItem.title"
        :description="doubleTaskOriginalItem.description"
        :note="doubleTaskOriginalItem.editorNote"
        :attachments="doubleTaskOriginalItem.attachments"
      >
        <template #meta>
          <TaskMeta :item="doubleTaskOriginalItem" show-type />
        </template>
      </TaskPreview>
    </template>

    <template #action-text>
      {{ t('tasks.list.double_task_confirm.view_existing') }}
    </template>

    <template #cancel-text>
      {{ t('tasks.list.double_task_confirm.create_anyway') }}
    </template>
  </BaseModal>
</template>
