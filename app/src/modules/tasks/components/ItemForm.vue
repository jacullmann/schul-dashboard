<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { HwItem } from '@/modules/tasks/composables/useTasks';
import type { ItemType } from '@/modules/tasks/types';
import { X, Upload, FileText } from '@lucide/vue';
import { useTaskItemForm } from '../composables/useTaskItemForm';
import ItemCard from './ItemCard.vue';

const { t } = useI18n();

const props = defineProps<{
  initialType?: Exclude<ItemType, 'all'>;
  initial?: HwItem | null;
  open: boolean;
}>();
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void }>();

const {
  typeTabItems,
  activeType,
  imgImages,
  imgUploading,
  imgUploadError,
  makeThumb,
  uploadImage,
  removeImg,
  makeUrl,
  isPdf,
  isDragging,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
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
  getSubjectName,
  getTypeLabel,
  doubleTaskSubjectName,
  doubleTaskTypeLabel,
  doubleTaskDueDate,
  doubleTaskConfirmMessage,
} = useTaskItemForm(props.initial, props.initialType, emit);
</script>

<template>
  <BaseModal
    :open="open"
    :submit="submit"
    :error="submitError"
    :loading="submitting"
    @cancel="emit('cancel')"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <template #title>
      {{
        initial
          ? t('tasks.list.item_form.edit_entry')
          : t('tasks.list.item_form.new_entry')
      }}
    </template>

    <template #content>
      <div
        v-if="isDragging"
        class="absolute inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-2xl pointer-events-none"
      >
        <div class="text-center p-6">
          <div class="text-2xl mb-2">📸</div>
          <div class="text-xl font-bold text-primary">
            {{
              t('tasks.list.item_form.drop_to_upload') || 'Bilder hier ablegen'
            }}
          </div>
        </div>
      </div>

      <BaseFormGroup v-if="!initial" id="type">
        <BaseTabs
          :items="typeTabItems"
          :active-id="activeType"
          @change="(id) => (activeType = id as Exclude<ItemType, 'all'>)"
        />
      </BaseFormGroup>

      <BaseFormGroup id="title" :error="titleError">
        <BaseLabel for="title" :required="true">{{
          t('tasks.list.item_form.title')
        }}</BaseLabel>
        <BaseInput
          id="title"
          ref="titleInputRef"
          v-model="title"
          :aria-describedby="titleError ? 'title-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup id="subject" :error="subjectError">
        <BaseLabel for="subject" :required="true">{{
          t('tasks.list.item_form.subject')
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
        <BaseLabel for="courseSel" :required="true">{{
          t('tasks.list.item_form.course')
        }}</BaseLabel>
        <BaseSelect
          id="courseSel"
          v-model="courseSel"
          :options="courseOptions"
          :aria-describedby="courseError ? 'courseSel-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup
        v-if="subjectSel === '__OTHER__'"
        id="subjectOther"
        :error="subjectOtherError"
      >
        <BaseLabel for="subjectOther" :required="true">{{
          t('tasks.list.item_form.custom_subject')
        }}</BaseLabel>
        <BaseInput
          id="subjectOther"
          v-model="subjectOther"
          :aria-describedby="
            subjectOtherError ? 'subjectOther-error' : undefined
          "
        />
      </BaseFormGroup>

      <BaseFormGroup id="description" :error="descriptionError">
        <BaseLabel for="description">{{
          t('tasks.list.item_form.description')
        }}</BaseLabel>
        <BaseInput
          id="description"
          v-model="description"
          as="textarea"
          rows="4"
          :aria-describedby="descriptionError ? 'description-error' : undefined"
        ></BaseInput>
      </BaseFormGroup>

      <BaseFormGroup id="dueDate" :error="dueDateError">
        <BaseLabel for="dueDate" :required="true">{{
          t('tasks.list.item_form.due_date')
        }}</BaseLabel>
        <BaseInput
          id="dueDate"
          v-model="dueLocal"
          type="date"
          :aria-describedby="dueDateError ? 'dueDate-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup id="images" :error="imgUploadError">
        <BaseLabel for="images">{{
          t('tasks.list.item_form.images')
        }}</BaseLabel>
        <BaseRow id="images">
          <div
            v-for="img in imgImages"
            :key="img.publicId"
            class="relative w-30 h-30 rounded-md overflow-hidden bg-[rgba(26, 26, 26, 0.5)] backdrop-blur-sm"
          >
            <BaseLink :to="makeUrl(img.publicId)">
              <img
                :src="makeThumb(img.publicId)"
                class="block w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                alt="Vorschau"
              />
            </BaseLink>

            <div
              v-if="isPdf(img)"
              class="absolute top-1 left-1 flex items-center gap-0.5 bg-black/60 border border-white/10 text-white px-1.5 py-0.5 rounded text-[10px] font-bold select-none pointer-events-none backdrop-blur-sm shadow-sm"
            >
              <FileText class="w-2.5 h-2.5 text-white" />
              <span>PDF</span>
            </div>
            <div class="absolute top-1 right-1">
              <BaseButton
                type="button"
                variant="danger"
                :icon="X"
                @click="removeImg(img, initial?.id)"
              >
                {{ t('tasks.list.item_form.remove_image') }}
              </BaseButton>
            </div>
          </div>

          <BaseTooltip
            :content="t('tasks.list.items.menu.upload_images')"
            placement="right"
          >
            <BaseButton
              type="button"
              :disabled="imgUploading"
              variant="ghost"
              :loading="imgUploading"
              :icon="Upload"
              @click="uploadImage(!!initial, initial?.id)"
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
    :sheet="true"
    :submit="viewExisting"
    :cancel="confirmDoubleTaskSubmit"
    :loading="submitting"
    @cancel="showDoubleTaskConfirm = false"
  >
    <template #title>
      {{ t('tasks.list.double_task_confirm.title') }}
    </template>

    <template #content>
      <p class="m-0!">
        {{ doubleTaskConfirmMessage }}
      </p>

      <ItemCard
        v-if="doubleTaskOriginalItem"
        :title="doubleTaskOriginalItem.title"
        :show-menu-trigger="false"
        :is-collapsed="false"
      >
        <template #badges>
          <div class="text-on-ghost-muted text-base">
            {{ doubleTaskTypeLabel }} • {{ doubleTaskSubjectName }} •
            {{ doubleTaskDueDate }}
            <template v-if="doubleTaskOriginalItem.createdByName">
              • {{ doubleTaskOriginalItem.createdByName }}
            </template>
          </div>
        </template>

        <template v-if="doubleTaskOriginalItem.description" #body>
          <div
            class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
          >
            {{ doubleTaskOriginalItem.description }}
          </div>
        </template>

        <template
          v-if="
            (doubleTaskOriginalItem.images &&
              doubleTaskOriginalItem.images.length) ||
            doubleTaskOriginalItem.editorNote
          "
          #content-after
        >
          <!-- Images block (non-interactive) -->
          <div
            v-if="
              doubleTaskOriginalItem.images &&
              doubleTaskOriginalItem.images.length
            "
            class="grid grid-cols-4 gap-2 mt-2 mb-2"
          >
            <div
              v-for="img in doubleTaskOriginalItem.images"
              :key="img.publicId"
              class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-none bg-black/[0.12] select-none"
            >
              <img
                :src="makeThumb(img.metadata?.thumbnailId || img.publicId)"
                class="block h-full w-full object-cover [pointer-events:none]"
                alt="Vorschau"
              />
            </div>
          </div>

          <!-- Notes block (non-interactive) -->
          <div
            v-if="doubleTaskOriginalItem.editorNote"
            class="note-section mt-2 pt-1 border-t border-surface-border"
          >
            <div class="text-on-ghost text-base font-bold mb-1">
              {{ t('tasks.list.notes.note') }}
            </div>
            <div
              class="text-on-ghost text-base whitespace-pre-wrap break-words"
            >
              {{ doubleTaskOriginalItem.editorNote }}
            </div>
          </div>
        </template>
      </ItemCard>
    </template>

    <template #action-text>
      {{ t('tasks.list.double_task_confirm.view_existing') }}
    </template>

    <template #cancel-text>
      {{ t('tasks.list.double_task_confirm.create_anyway') }}
    </template>
  </BaseModal>
</template>
