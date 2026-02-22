<template>
  <Modal @cancel="emit('cancel')">
    <template #title>
      {{ initial ? t('school.tasks.itemForm.editEntry') : t('school.tasks.itemForm.newEntry') + labelFor(type) }}
    </template>

    <template #content>
      <div class="row-n top">
        <div class="col">
          <label class="label">{{ t('school.tasks.itemForm.title') }}</label>
          <input ref="titleInputRef" class="input" v-model="title" />
        </div>

        <div class="col">
          <label class="label">{{ t('school.tasks.itemForm.subject') }}</label>
          <SelectDropdown
              v-model="subjectSel"
              :options="subjectOptions"
          />
        </div>

        <div class="col" v-if="subjectSel === 'enrichment'">
          <label class="label">{{ t('school.tasks.itemForm.course') }}</label>
          <SelectDropdown
              v-model="enrKursSel"
              :options="enrOptions"
          />
        </div>

        <div class="col" v-if="subjectSel === 'wpu1'">
          <label class="label">{{ t('school.tasks.itemForm.course') }}</label>
          <SelectDropdown
              v-model="wpuDiKursSel"
              :options="wpuDiOptions"
          />
        </div>

        <div class="col" v-if="subjectSel === 'wpu2'">
          <label class="label">{{ t('school.tasks.itemForm.course') }}</label>
          <SelectDropdown
              v-model="wpuDoKursSel"
              :options="wpuDoOptions"
          />
        </div>
      </div>

      <div v-if="subjectSel==='__OTHER__'" class="section">
        <label class="label">{{ t('school.tasks.itemForm.customSubject') }}</label>
        <input class="input" v-model="subjectOther"/>
      </div>

      <div class="section">
        <label class="label">{{ t('school.tasks.itemForm.description') }}</label>
        <textarea class="input" rows="4" v-model="description"></textarea>
      </div>

      <div class="row-n section">
        <div class="col">
          <label class="label">{{ t('school.tasks.itemForm.dueDate') }}</label>
          <input class="input hover" type="date" v-model="dueLocal" />

        </div>
      </div>

      <div class="section">
        <div class="label">{{ t('school.tasks.itemForm.images') }}</div>
        <div class="row-n images">
          <div
              v-for="img in imgImages"
              :key="img.publicId"
              class="image-item"
          >
            <a :href="img.url" target="_blank" rel="noopener">
              <img
                  :src="img.thumbUrl || makeThumb(img.url)"
                  class="thumb"
                  loading="lazy"
                  decoding="async"
                  alt="Vorschau"
              />
            </a>
            <div class="image-actions">
              <button class="btn danger image-remove" @click="removeImg(img, initial?.id)">X</button>
            </div>
          </div>

          <button data-umami-event="Bild zu Eintrag hinzufügen Button" class="btn ghost" @click="uploadImage(!!initial)" :disabled="imgUploading">
            <LoadingSpinner v-if="imgUploading" size="1.1em" />
            <span v-else>{{ t('school.tasks.items.menu.uploadImages') }}</span>
          </button>
        </div>
        <div v-if="imgUploading" class="small">{{ t('school.tasks.itemForm.uploadingImage') }}</div>
        <div v-if="imgUploadError" class="small error">{{ imgUploadError }}</div>
      </div>
    </template>

    <template #actions>
      <div class="row actions">
        <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>

        <button class="btn ghost" @click="emit('cancel')">
          {{ t('global.buttons.cancel') }}
        </button>

        <button class="btn action" @click="submit" :disabled="submitting">
          <LoadingSpinner v-if="submitting" size="1.1em" />
          <span v-else>{{ initial ? t('global.buttons.save') : t('global.buttons.create') }}</span>
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import hw from '@/api/hwApi';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import type { HwItem } from '@/modules/tasks/composables/useHausaufgaben.ts';
import { containsProfanity } from '@/modules/tasks/composables/useProfanity.ts';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload.ts';
import Modal from '@/common/components/Modal.vue';
import SelectDropdown from '@/common/components/SelectDropdown.vue';
import { useI18n } from 'vue-i18n';
import { AVAILABLE_SUBJECTS, ENR_COURSES, WPU1_COURSES, WPU2_COURSES } from '@/types/subjects.ts';
const { t } = useI18n();

const props = defineProps<{
  type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
  initial?: HwItem | null;
}>();
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void; }>();

const { images: imgImages, uploading: imgUploading, uploadError: imgUploadError, init: imgInit, makeThumb, uploadImage, removeImg } = useImageUpload();

const labelFor = (type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG') => {
  const map = {
    'HAUSAUFGABE': t('school.tasks.types.homework'),
    'DALTON': t('school.tasks.types.dalton'),
    'PRUEFUNG': t('school.tasks.types.exam'),
  } as const;
  return map[type];
};


const getInitialSubjectParts = () => {
  const initial = props.initial?.subject;
  if (!initial) return { main: '', course: '' };

  const parts = initial.split(' - ');
  if (parts.length === 2) {
    const main = parts[0]!.trim();
    const course = parts[1]!.trim();
    if (['enrichment', 'wpu1', 'wpu2', 'Enrichment', 'WPU (Di)', 'WPU (Do)'].includes(main)) {
      // Map old main to new main
      const keyMap: Record<string, string> = {
        'Enrichment': 'enrichment',
        'WPU (Di)': 'wpu1',
        'WPU (Do)': 'wpu2',
      };

      // Attempt to resolve legacy names to IDs (only relevant for old strings editing)
      let resolvedCourseId = course;
      const mappedMain = keyMap[main] || main;

      if (main === 'Enrichment' || main === 'enrichment') {
        const found = ENR_COURSES.find(k => k.name === course || k.id === course);
        if (found) resolvedCourseId = found.id;
      }
      if (main === 'WPU (Di)' || main === 'wpu1') {
        const found = WPU1_COURSES.find(k => k.name === course || k.id === course);
        if (found) resolvedCourseId = found.id;
      }
      if (main === 'WPU (Do)' || main === 'wpu2') {
        const found = WPU2_COURSES.find(k => k.name === course || k.id === course);
        if (found) resolvedCourseId = found.id;
      }

      return { main: mappedMain, course: resolvedCourseId };
    }
  }
  return { main: initial, course: '' };
};

const initialParts = getInitialSubjectParts();

const title = ref(props.initial?.title || '');
const subjectSel = ref(initialParts.main);
const subjectOther = ref('');
const description = ref(props.initial?.description || '');
const enrKursSel = ref(initialParts.main === 'enrichment' ? initialParts.course : '');
const wpuDiKursSel = ref(initialParts.main === 'wpu1' ? initialParts.course : '');
const wpuDoKursSel = ref(initialParts.main === 'wpu2' ? initialParts.course : '');

watch(subjectSel, (newVal) => {
  if (newVal !== 'enrichment') enrKursSel.value = '';
  if (newVal !== 'wpu1') wpuDiKursSel.value = '';
  if (newVal !== 'wpu2') wpuDoKursSel.value = '';
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
  } catch { return new Date().toISOString().slice(0,10); }
}

const dueLocal = ref(
    props.initial?.dueDate ? isoDateOnlyFromIso(props.initial.dueDate) : new Date().toISOString().slice(0,10)
);

const submitting = ref(false);
const message = ref('');
const isError = ref(false);

const subjectOptions = computed(() => {
  const opts = AVAILABLE_SUBJECTS.map(s => ({
    label: t(`global.subjects.${s}`),
    value: s
  }));

  opts.push({ label: t('global.selection.other'), value: '__OTHER__' });

  return opts;
});

const getCourseLabel = (courseName: string): string => {
  const map: Record<string, string> = {
    'Englisch': t('global.subjects.english'),
    'Deutsch': t('global.subjects.german'),
    'Biologie': t('global.subjects.biology'),
    'Geschichte': t('global.subjects.history'),
    'Informatik': t('global.subjects.cs'),
    'Latein': t('global.subjects.latin'),
    'Mathe': t('global.subjects.math'),
    'Musik': t('global.subjects.music'),
    'Herr Müller': `${t('global.titles.abbr.mr')} Müller`,
    'Herr Weber': `${t('global.titles.abbr.mr')} Weber`,
    'Frau Glier': `${t('global.titles.abbr.ms')} Glier`,
    'Frau Thamm': `${t('global.titles.abbr.ms')} Thamm`
  };
  return map[courseName] || courseName;
};

const enrOptions = ENR_COURSES.map(k => ({ label: getCourseLabel(k.name), value: k.id }));
const wpuDiOptions = WPU1_COURSES.map(k => ({ label: getCourseLabel(k.name), value: k.id }));
const wpuDoOptions = WPU2_COURSES.map(k => ({ label: getCourseLabel(k.name), value: k.id }));

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;

  const resolveSubject = () => {
    const main = subjectSel.value;

    if (main === '__OTHER__') {
      return subjectOther.value.trim();
    }

    if (main === 'enrichment') {
      if (!enrKursSel.value) throw new Error(t('school.tasks.itemForm.errors.enrichmentMissing'));
      return `enrichment - ${enrKursSel.value}`;
    }

    if (main === 'wpu1') {
      if (!wpuDiKursSel.value) throw new Error(t('school.tasks.itemForm.errors.wpuMissing'));
      return `wpu1 - ${wpuDiKursSel.value}`;
    }

    if (main === 'wpu2') {
      if (!wpuDoKursSel.value) throw new Error(t('school.tasks.itemForm.errors.wpuMissing'));
      return `wpu2 - ${wpuDoKursSel.value}`;
    }

    return main;
  };

  try {
    const hasProfanity = [
      title.value,
      subjectSel.value,
      subjectOther.value,
      description.value
    ].some(text => containsProfanity(text));

    if (hasProfanity) {
      throw new Error(t('school.tasks.itemForm.errors.profanity'));
    }

    const subject = resolveSubject();

    if (!subject || !subject.length) {
      throw new Error(t('school.tasks.itemForm.errors.customMissing'));
    }
    if (subject.length > 40) {
      throw new Error(t('school.tasks.itemForm.errors.customLong'));
    }

    const cleanTitle = title.value.trim();
    const cleanDesc = description.value.trim();

    if (!cleanTitle) {
      throw new Error(t('school.tasks.itemForm.errors.titleMissing'));
    }
    if (cleanTitle.length > 60) {
      throw new Error(t('school.tasks.itemForm.errors.titleLong'));
    }
    if (cleanDesc.length > 1000) {
      throw new Error(t('school.tasks.itemForm.errors.descriptionLong'));
    }

    const selectedDate = new Date(dueLocal.value);
    selectedDate.setHours(23, 59, 0, 0);

    if (selectedDate < minDate) throw new Error(t('school.tasks.itemForm.errors.dateOld'));
    if (selectedDate > maxDate) throw new Error(t('school.tasks.itemForm.errors.dateNew'));

    const payload = {
      type: props.type,
      title: cleanTitle,
      subject,
      description: cleanDesc,
      images: imgImages.value,
      dueDate: selectedDate.toISOString()
    };

    if (props.initial) {
      await hw.patch(`/api/items/${props.initial.id}`, payload);
      message.value = t('school.tasks.itemForm.successEdit');
    } else {
      await hw.post('/api/items', payload);
      message.value = t('school.tasks.itemForm.successCreate');
    }

    emit('success');

  } catch (e: any) {
    isError.value = true;

    if (e.response?.status === 400) {
      message.value = e.response.data.error || 'Bitte überprüfe deine Eingaben.';
    } else {
      message.value = e.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  } finally {
    submitting.value = false;
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel');
}

const titleInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  imgInit(props.initial?.images || []);
  window.addEventListener('keydown', onKeyDown);
  titleInputRef.value?.focus();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.section {
  margin-top: 16px;
}
.top {
  gap: 16px;
}

.label {
  display: block;
  font-size: var(--font-size-button);
  color: var(--text);
  margin-bottom: 6px;
}

.images {
  gap: 8px;
  justify-content: flex-start;
}
.image-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: var(--border-4);
  overflow: hidden;
  background: rgba(26, 26, 26, 0.5);
  backdrop-filter: blur(8px) brightness(95%);
  -webkit-backdrop-filter: blur(8px) brightness(95%);
}
.thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-actions {
  position: absolute;
  top: 4px;
  right: 4px;
}
.image-remove {
  padding: 4px 8px;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.small {
  font-size: var(--font-size-sub);
  color: var(--sub);
  align-self: center;
}
.error {
  color: var(--danger);
}
.msg-ok {
  color: var(--primary);
}
.msg-error {
  color: var(--danger);
}
</style>