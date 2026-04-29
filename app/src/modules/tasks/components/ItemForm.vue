<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import hw from '@/api/hwApi';
import type { HwItem } from '@/modules/tasks/composables/useTasks';
import type { ItemType } from '@/modules/tasks/types';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload';
import { useI18n } from 'vue-i18n';
import { getSubjectKey } from '@/types/subjects';
import { useSubjectStore } from '@/stores/subjectStore';
import { X, Upload } from '@lucide/vue';
import BaseInput from '@/common/components/BaseInput.vue';

const { t, te } = useI18n();
const subjectStore = useSubjectStore();

const props = defineProps<{
  /** Pre-selected entry type when creating; ignored when editing. */
  initialType?: Exclude<ItemType, 'all'>;
  initial?: HwItem | null;
}>();
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void }>();

// ── Type tabs ──────────────────────────────────────────────────────────────
const typeTabItems = computed(() => [
  { id: 'homework', label: t('school.tasks.types.homework') },
  { id: 'dalton', label: t('school.tasks.types.dalton') },
  { id: 'exam', label: t('school.tasks.types.exam') },
]);

// When editing, type is fixed to the item's type. When creating, it starts at
// the provided initialType (default: 'homework') and can be changed via tabs.
const activeType = ref<Exclude<ItemType, 'all'>>(
  props.initial ? props.initial.type : (props.initialType ?? 'homework'),
);

const {
  images: imgImages,
  uploading: imgUploading,
  uploadError: imgUploadError,
  init: imgInit,
  makeThumb,
  uploadImage,
  removeImg,
  uploadFiles,
} = useImageUpload();

const isDragging = ref(false);
const dragCounter = ref(0);

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  dragCounter.value++;
  isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  dragCounter.value--;
  if (dragCounter.value === 0) {
    isDragging.value = false;
  }
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  dragCounter.value = 0;
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const imageFiles = Array.from(files).filter((f) =>
    f.type.startsWith('image/'),
  );
  if (imageFiles.length === 0) return;

  await uploadFiles(imageFiles, !!props.initial, props.initial?.id);
};

const getInitialSubjectParts = () => {
  const initial = props.initial?.subject;
  if (!initial) return { main: '', course: '' };

  const parts = initial.split(' - ');
  if (parts.length === 2) {
    const main = parts[0]!.trim();
    const course = parts[1]!.trim();
    const subject = subjectStore.subjects.find((s) => s.name === main);
    if (subject && subject.courses && subject.courses.length > 0) {
      return { main, course };
    }
  }
  return { main: initial, course: '' };
};

const initialParts = getInitialSubjectParts();

const title = ref(props.initial?.title || '');
const subjectSel = ref(initialParts.main);
const subjectOther = ref('');
const description = ref(props.initial?.description || '');
const courseSel = ref(initialParts.course);

// Form Specific Error Refs
const titleError = ref('');
const subjectError = ref('');
const courseError = ref('');
const subjectOtherError = ref('');
const descriptionError = ref('');
const dueDateError = ref('');

watch(subjectSel, () => {
  courseSel.value = '';
});

const now = new Date();
const minDate = new Date();
minDate.setDate(now.getDate() - 2);
minDate.setHours(0, 0, 0, 0);

const maxDate = new Date();
maxDate.setDate(now.getDate() + 365);
maxDate.setHours(23, 59, 59, 999);

function isoDateOnlyFromIso(iso: string) {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const dueLocal = ref(
  props.initial?.dueDate
    ? isoDateOnlyFromIso(props.initial.dueDate)
    : new Date().toISOString().slice(0, 10),
);

const submitting = ref(false);
const submitError = ref('');

const subjectOptions = computed(() => {
  const opts = subjectStore.availableSubjectKeys.map((s) => {
    const translationKey = `global.subjects.${s}`;
    const label = te(translationKey) ? t(translationKey) : s;
    return { label, value: s };
  });

  opts.push({ label: t('global.selection.other'), value: '__OTHER__' });

  return opts;
});

const getCourseLabel = (courseName: string): string => {
  const courseKey = getSubjectKey(courseName);
  if (te(`global.subjects.${courseKey}`)) {
    return t(`global.subjects.${courseKey}`);
  }

  const mr = t('global.titles.abbr.mr');
  const ms = t('global.titles.abbr.ms');
  return courseName.replace(/^Herr\s+/, `${mr} `).replace(/^Frau\s+/, `${ms} `);
};

const selectedSubjectHasCourses = computed(() => {
  const match = subjectStore.subjects.find((s) => s.name === subjectSel.value);
  if (!match || !match.courses) return false;
  if (match.category === 'core') return false;
  if (match.category === 'extra') return match.courses.length >= 2;
  return match.courses.length >= 1;
});

const courseOptions = computed(() => {
  const match = subjectStore.subjects.find((s) => s.name === subjectSel.value);
  if (!match || !match.courses) return [];
  return match.courses.map((c) => ({
    label: getCourseLabel(c.name),
    value: c.name,
  }));
});

async function submit() {
  submitting.value = true;
  submitError.value = '';

  // Reset all specific form errors
  titleError.value = '';
  subjectError.value = '';
  courseError.value = '';
  subjectOtherError.value = '';
  descriptionError.value = '';
  dueDateError.value = '';

  let hasValidationErrors = false;
  let finalSubject = '';

  // --- 1. Validate Subject ---
  const main = subjectSel.value;
  if (!main) {
    subjectError.value = t('school.tasks.itemForm.errors.customMissing');
    hasValidationErrors = true;
  } else if (main === '__OTHER__') {
    finalSubject = subjectOther.value.trim();
    if (!finalSubject) {
      subjectOtherError.value = t('school.tasks.itemForm.errors.customMissing');
      hasValidationErrors = true;
    } else if (finalSubject.length > 100) {
      subjectOtherError.value = t('school.tasks.itemForm.errors.customLong');
      hasValidationErrors = true;
    }
  } else if (selectedSubjectHasCourses.value) {
    if (!courseSel.value) {
      const translationKey = `global.subjects.${main}`;
      const courseName = te(translationKey) ? t(translationKey) : main;
      courseError.value = t('school.tasks.itemForm.errors.courseMissing', {
        course: courseName,
      });
      hasValidationErrors = true;
    } else {
      finalSubject = `${main} - ${courseSel.value}`;
    }
  } else {
    finalSubject = main;
  }

  // --- 2. Validate Title ---
  const cleanTitle = title.value.trim();
  if (!cleanTitle) {
    titleError.value = t('school.tasks.itemForm.errors.titleMissing');
    hasValidationErrors = true;
  } else if (cleanTitle.length > 60) {
    titleError.value = t('school.tasks.itemForm.errors.titleLong');
    hasValidationErrors = true;
  }

  // --- 3. Validate Description ---
  const cleanDesc = description.value.trim();
  if (cleanDesc.length > 1000) {
    descriptionError.value = t('school.tasks.itemForm.errors.descriptionLong');
    hasValidationErrors = true;
  }

  // --- 4. Validate Due Date ---
  const selectedDate = new Date(dueLocal.value);
  selectedDate.setHours(23, 59, 0, 0);

  if (selectedDate < minDate) {
    dueDateError.value = t('school.tasks.itemForm.errors.dateOld');
    hasValidationErrors = true;
  } else if (selectedDate > maxDate) {
    dueDateError.value = t('school.tasks.itemForm.errors.dateNew');
    hasValidationErrors = true;
  }

  // If any errors were found, stop execution before API call
  if (hasValidationErrors) {
    submitting.value = false;
    return;
  }

  try {
    const payload = {
      type: activeType.value,
      title: cleanTitle,
      subject: finalSubject,
      description: cleanDesc,
      images: imgImages.value,
      dueDate: selectedDate.toISOString(),
    };

    if (props.initial) {
      await hw.patch(`/api/items/${props.initial.id}`, payload);
    } else {
      await hw.post('/api/items', payload);
    }

    emit('success');
  } catch (e: unknown) {
    // This catches actual server errors during the API call
    const err = e as {
      response?: { status?: number; data?: { error?: string } };
      message?: string;
    };

    if (err.response?.status === 400) {
      submitError.value =
        err.response?.data?.error || 'Bitte überprüfe deine Eingaben.';
    } else {
      submitError.value =
        err.message ||
        'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  } finally {
    submitting.value = false;
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel');
}

const titleInputRef = ref<InstanceType<typeof BaseInput> | null>(null);

useEventListener(window, 'keydown', onKeyDown);

onMounted(() => {
  imgInit(props.initial?.images || []);
  titleInputRef.value?.focus();
});
</script>

<template>
  <div
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    class="relative"
  >
    <BaseModal
      @cancel="emit('cancel')"
      :submit="submit"
      :error="submitError"
      :loading="submitting"
    >
      <template #title>
        {{
          initial
            ? t('school.tasks.itemForm.editEntry')
            : t('school.tasks.itemForm.newEntry')
        }}
      </template>

      <template #content>
        <!-- Drag & Drop Overlay -->
        <div
          v-if="isDragging"
          class="absolute inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-2xl pointer-events-none"
        >
          <div class="text-center p-6">
            <div class="text-2xl mb-2">📸</div>
            <div class="text-xl font-bold text-primary">
              {{
                t('school.tasks.itemForm.dropToUpload') || 'Bilder hier ablegen'
              }}
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <BaseFormGroup v-if="!initial" id="type">
          <BaseTabs
            :items="typeTabItems"
            :active-id="activeType"
            @change="(id) => (activeType = id as Exclude<ItemType, 'all'>)"
          />
        </BaseFormGroup>

        <BaseFormGroup id="title" :error="titleError">
          <BaseLabel for="title" :required="true">{{
            t('school.tasks.itemForm.title')
          }}</BaseLabel>
          <BaseInput
            ref="titleInputRef"
            id="title"
            v-model="title"
            :aria-describedby="titleError ? 'title-error' : undefined"
          />
        </BaseFormGroup>

        <BaseFormGroup id="subject" :error="subjectError">
          <BaseLabel for="subject" :required="true">{{
            t('school.tasks.itemForm.subject')
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
            t('school.tasks.itemForm.course')
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
            t('school.tasks.itemForm.customSubject')
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
            t('school.tasks.itemForm.description')
          }}</BaseLabel>
          <BaseInput
            id="description"
            as="textarea"
            rows="4"
            v-model="description"
            :aria-describedby="
              descriptionError ? 'description-error' : undefined
            "
          ></BaseInput>
        </BaseFormGroup>

        <BaseFormGroup id="dueDate" :error="dueDateError">
          <BaseLabel for="dueDate" :required="true">{{
            t('school.tasks.itemForm.dueDate')
          }}</BaseLabel>
          <BaseInput
            id="dueDate"
            type="date"
            v-model="dueLocal"
            :aria-describedby="dueDateError ? 'dueDate-error' : undefined"
          />
        </BaseFormGroup>

        <BaseFormGroup id="images" :error="imgUploadError">
          <BaseLabel for="images">{{
            t('school.tasks.itemForm.images')
          }}</BaseLabel>
          <BaseRow id="images">
            <div
              v-for="img in imgImages"
              :key="img.publicId"
              class="relative w-30 h-30 rounded-md overflow-hidden bg-[rgba(26, 26, 26, 0.5)] backdrop-blur-sm"
            >
              <BaseLink :to="img.url">
                <img
                  :src="img.thumbUrl || (img.url ? makeThumb(img.url) : '')"
                  class="block w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  alt="Vorschau"
                />
              </BaseLink>
              <div class="absolute top-1 right-1">
                <BaseButton
                  type="button"
                  @click="removeImg(img, initial?.id)"
                  variant="danger"
                  :icon="X"
                >
                  {{ t('school.tasks.itemForm.removeImage') }}
                </BaseButton>
              </div>
            </div>

            <BaseTooltip :content="t('school.tasks.items.menu.uploadImages')" placement="right">
              <BaseButton
                type="button"
                @click="uploadImage(!!initial)"
                :disabled="imgUploading"
                variant="ghost"
                :loading="imgUploading"
                :icon="Upload"
              />
            </BaseTooltip>
          </BaseRow>
        </BaseFormGroup>
      </template>

      <template #action-text>
        {{ initial ? t('global.buttons.save') : t('global.buttons.create') }}
      </template>
    </BaseModal>
  </div>
</template>
