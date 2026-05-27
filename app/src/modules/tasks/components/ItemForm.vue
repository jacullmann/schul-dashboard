<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import hw from '../../../api/api';
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
  initialType?: Exclude<ItemType, 'all'>;
  initial?: HwItem | null;
  open: boolean;
}>();
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void }>();

const typeTabItems = computed(() => [
  { id: 'homework', label: t('tasks.list.types.homework') },
  { id: 'dalton', label: t('tasks.list.types.dalton') },
  { id: 'exam', label: t('tasks.list.types.exam') },
]);

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
    const translationKey = `common.subjects.${s}`;
    const label = te(translationKey) ? t(translationKey) : s;
    return { label, value: s };
  });

  opts.push({ label: t('common.selection.other'), value: '__OTHER__' });

  return opts;
});

const getCourseLabel = (courseName: string): string => {
  const courseKey = getSubjectKey(courseName);
  if (te(`common.subjects.${courseKey}`)) {
    return t(`common.subjects.${courseKey}`);
  }

  const mr = t('common.titles.abbr.mr');
  const ms = t('common.titles.abbr.ms');
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

  titleError.value = '';
  subjectError.value = '';
  courseError.value = '';
  subjectOtherError.value = '';
  descriptionError.value = '';
  dueDateError.value = '';

  let hasValidationErrors = false;
  let finalSubject = '';

  const main = subjectSel.value;
  if (!main) {
    subjectError.value = t('tasks.list.item_form.errors.custom_missing');
    hasValidationErrors = true;
  } else if (main === '__OTHER__') {
    finalSubject = subjectOther.value.trim();
    if (!finalSubject) {
      subjectOtherError.value = t('tasks.list.item_form.errors.custom_missing');
      hasValidationErrors = true;
    } else if (finalSubject.length > 100) {
      subjectOtherError.value = t('tasks.list.item_form.errors.custom_long');
      hasValidationErrors = true;
    }
  } else if (selectedSubjectHasCourses.value) {
    if (!courseSel.value) {
      const translationKey = `common.subjects.${main}`;
      const courseName = te(translationKey) ? t(translationKey) : main;
      courseError.value = t('tasks.list.item_form.errors.course_missing', {
        course: courseName,
      });
      hasValidationErrors = true;
    } else {
      finalSubject = `${main} - ${courseSel.value}`;
    }
  } else {
    finalSubject = main;
  }

  const cleanTitle = title.value.trim();
  if (!cleanTitle) {
    titleError.value = t('tasks.list.item_form.errors.title_missing');
    hasValidationErrors = true;
  } else if (cleanTitle.length > 60) {
    titleError.value = t('tasks.list.item_form.errors.title_long');
    hasValidationErrors = true;
  }

  const cleanDesc = description.value.trim();
  if (cleanDesc.length > 1000) {
    descriptionError.value = t('tasks.list.item_form.errors.description_long');
    hasValidationErrors = true;
  }

  const selectedDate = new Date(dueLocal.value);
  selectedDate.setHours(23, 59, 0, 0);

  if (selectedDate < minDate) {
    dueDateError.value = t('tasks.list.item_form.errors.date_old');
    hasValidationErrors = true;
  } else if (selectedDate > maxDate) {
    dueDateError.value = t('tasks.list.item_form.errors.date_new');
    hasValidationErrors = true;
  }

  if (hasValidationErrors) {
    submitting.value = false;
    return;
  }

  try {
    const payload = {
      title: cleanTitle,
      subject: finalSubject,
      description: cleanDesc,
      images: imgImages.value.map((img) => ({
        publicId: img.publicId,
        metadata: img.metadata || {},
      })),
      dueDate: selectedDate.toISOString(),
    };

    if (props.initial) {
      await hw.patch(`/items/${props.initial.id}`, payload);
    } else {
      await hw.post('/items', {
        ...payload,
        type: activeType.value,
      });
    }

    emit('success');
  } catch (e: unknown) {
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
  <BaseModal
    :open="open"
    @cancel="emit('cancel')"
    :submit="submit"
    :error="submitError"
    :loading="submitting"
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
          ref="titleInputRef"
          id="title"
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
          as="textarea"
          rows="4"
          v-model="description"
          :aria-describedby="descriptionError ? 'description-error' : undefined"
        ></BaseInput>
      </BaseFormGroup>

      <BaseFormGroup id="dueDate" :error="dueDateError">
        <BaseLabel for="dueDate" :required="true">{{
          t('tasks.list.item_form.due_date')
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
          t('tasks.list.item_form.images')
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
      {{ initial ? t('common.buttons.save') : t('common.buttons.create') }}
    </template>
  </BaseModal>
</template>
