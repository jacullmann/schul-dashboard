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
import { X } from '@lucide/vue';
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
    if (['enrichment', 'wpu1', 'wpu2'].includes(main)) {
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
const enrKursSel = ref(
  initialParts.main === 'enrichment' ? initialParts.course : '',
);
const wpu1KursSel = ref(
  initialParts.main === 'wpu1' ? initialParts.course : '',
);
const wpu2KursSel = ref(
  initialParts.main === 'wpu2' ? initialParts.course : '',
);

// Form Specific Error Refs
const titleError = ref('');
const subjectError = ref('');
const enrError = ref('');
const wpu1Error = ref('');
const wpu2Error = ref('');
const subjectOtherError = ref('');
const descriptionError = ref('');
const dueDateError = ref('');

watch(subjectSel, (newVal) => {
  if (newVal !== 'enrichment') enrKursSel.value = '';
  if (newVal !== 'wpu1') wpu1KursSel.value = '';
  if (newVal !== 'wpu2') wpu2KursSel.value = '';
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
const message = ref('');
const isError = ref(false);

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

const enrOptions = computed(() =>
  subjectStore.enrCourses.map((k) => ({
    label: getCourseLabel(k.name),
    value: k.id,
  })),
);
const wpu1Options = computed(() =>
  subjectStore.wpu1Courses.map((k) => ({
    label: getCourseLabel(k.name),
    value: k.id,
  })),
);
const wpu2Options = computed(() =>
  subjectStore.wpu2Courses.map((k) => ({
    label: getCourseLabel(k.name),
    value: k.id,
  })),
);

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;

  // Reset all specific form errors
  titleError.value = '';
  subjectError.value = '';
  enrError.value = '';
  wpu1Error.value = '';
  wpu2Error.value = '';
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
  } else if (main === 'enrichment') {
    if (!enrKursSel.value) {
      enrError.value = t('school.tasks.itemForm.errors.enrichmentMissing');
      hasValidationErrors = true;
    } else {
      finalSubject = `enrichment - ${enrKursSel.value}`;
    }
  } else if (main === 'wpu1') {
    if (!wpu1KursSel.value) {
      wpu1Error.value = t('school.tasks.itemForm.errors.wpuMissing');
      hasValidationErrors = true;
    } else {
      finalSubject = `wpu1 - ${wpu1KursSel.value}`;
    }
  } else if (main === 'wpu2') {
    if (!wpu2KursSel.value) {
      wpu2Error.value = t('school.tasks.itemForm.errors.wpuMissing');
      hasValidationErrors = true;
    } else {
      finalSubject = `wpu2 - ${wpu2KursSel.value}`;
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
    isError.value = true;

    // This catches actual server errors during the API call
    const err = e as {
      response?: { status?: number; data?: { error?: string } };
      message?: string;
    };
    
    if (err.response?.status === 400) {
      message.value = err.response?.data?.error || 'Bitte überprüfe deine Eingaben.';
    } else {
      message.value = err.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
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
  <form
    @submit.prevent="submit"
    novalidate
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
    class="relative"
  >
    <BaseModal @cancel="emit('cancel')">
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
            <div class="text-h2 mb-2">📸</div>
            <div class="text-h3 font-bold text-primary">
              {{
                t('school.tasks.itemForm.dropToUpload') || 'Bilder hier ablegen'
              }}
            </div>
          </div>
        </div>

        <BaseForm>
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
            <BaseInput ref="titleInputRef" id="title" v-model="title" :aria-describedby="titleError" />
          </BaseFormGroup>

          <BaseFormGroup id="subject" :error="subjectError">
            <BaseLabel for="subject" :required="true">{{
              t('school.tasks.itemForm.subject')
            }}</BaseLabel>
            <BaseSelect
              id="subject"
              v-model="subjectSel"
              :options="subjectOptions"
              :aria-describedby="subjectError"
            />
          </BaseFormGroup>

          <BaseFormGroup v-if="subjectSel === 'enrichment'" id="enrKursSel" :error="enrError">
            <BaseLabel for="enrKursSel" :required="true">{{
              t('school.tasks.itemForm.course')
            }}</BaseLabel>
            <BaseSelect
              id="enrKursSel"
              v-model="enrKursSel"
              :options="enrOptions"
              :aria-describedby="enrError"
            />
          </BaseFormGroup>

          <BaseFormGroup v-if="subjectSel === 'wpu1'" id="wpu1KursSel" :error="wpu1Error">
            <BaseLabel for="wpu1KursSel" :required="true">{{
              t('school.tasks.itemForm.course')
            }}</BaseLabel>
            <BaseSelect
              id="wpu1KursSel"
              v-model="wpu1KursSel"
              :options="wpu1Options"
              :aria-describedby="wpu1Error"
            />
          </BaseFormGroup>

          <BaseFormGroup v-if="subjectSel === 'wpu2'" id="wpu2KursSel" :error="wpu2Error">
            <BaseLabel for="wpu2KursSel" :required="true">{{
              t('school.tasks.itemForm.course')
            }}</BaseLabel>
            <BaseSelect
              id="wpu2KursSel"
              v-model="wpu2KursSel"
              :options="wpu2Options"
              :aria-describedby="wpu2Error"
            />
          </BaseFormGroup>

          <BaseFormGroup v-if="subjectSel === '__OTHER__'" id="subjectOther" :error="subjectOtherError">
            <BaseLabel for="subjectOther" :required="true">{{
              t('school.tasks.itemForm.customSubject')
            }}</BaseLabel>
            <BaseInput id="subjectOther" v-model="subjectOther" :aria-describedby="subjectOtherError"/>
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
              :aria-describedby="descriptionError"
            ></BaseInput>
          </BaseFormGroup>

          <BaseFormGroup id="dueDate" :error="dueDateError">
            <BaseLabel for="dueDate" :required="true">{{
              t('school.tasks.itemForm.dueDate')
            }}</BaseLabel>
            <BaseInput id="dueDate" type="date" v-model="dueLocal" :aria-describedby="dueDateError" />
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
                    class="px-2 py-1"
                    @click="removeImg(img, initial?.id)"
                    variant="danger"
                    >
                    <X :size="12"/>
                  </BaseButton>
                </div>
              </div>

              <BaseButton
                type="button"
                @click="uploadImage(!!initial)"
                :disabled="imgUploading"
                variant="ghost"
                :loading="imgUploading"
              >
                {{ t('school.tasks.items.menu.uploadImages') }}
              </BaseButton>
            </BaseRow>

            <div v-if="imgUploading" class="text-sub text-on-surface-muted self-center">
              {{ t('school.tasks.itemForm.uploadingImage') }}
            </div>
          </BaseFormGroup>
        </BaseForm>
      </template>

      <template #action-btn>
        <BaseButton
          type="submit"
          :disabled="submitting"
          variant="action"
          :loading="submitting"
        >
          {{
            initial ? t('global.buttons.save') : t('global.buttons.create')
          }}
        </BaseButton>
      </template>
    </BaseModal>
  </form>
</template>
