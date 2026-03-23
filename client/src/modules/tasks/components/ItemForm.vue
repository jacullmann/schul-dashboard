<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import hw from '@/api/hwApi';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import type { HwItem } from '@/modules/tasks/composables/useTasks';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload';
import Modal from '@/common/components/Modal.vue';
import SelectDropdown from '@/common/components/SelectDropdown.vue';
import { useI18n } from 'vue-i18n';
import { getSubjectKey } from '@/types/subjects';
import { useSubjectStore } from '@/stores/subjectStore';

const { t, te } = useI18n();
const subjectStore = useSubjectStore();

const props = defineProps<{
  type: 'homework' | 'dalton' | 'exam';
  initial?: HwItem | null;
}>();
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'success'): void; }>();

const { images: imgImages, uploading: imgUploading, uploadError: imgUploadError, init: imgInit, makeThumb, uploadImage, removeImg } = useImageUpload();

const labelFor = (type: 'homework' | 'dalton' | 'exam') => {
  const map = {
    'homework': t('school.tasks.types.homework'),
    'dalton': t('school.tasks.types.dalton'),
    'exam': t('school.tasks.types.exam'),
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
  const opts = subjectStore.availableSubjectKeys.map(s => {
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
  return courseName
    .replace(/^Herr\s+/, `${mr} `)
    .replace(/^Frau\s+/, `${ms} `);
};

const enrOptions = computed(() => subjectStore.enrCourses.map(k => ({ label: getCourseLabel(k.name), value: k.id })));
const wpuDiOptions = computed(() => subjectStore.wpu1Courses.map(k => ({ label: getCourseLabel(k.name), value: k.id })));
const wpuDoOptions = computed(() => subjectStore.wpu2Courses.map(k => ({ label: getCourseLabel(k.name), value: k.id })));

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

    const subject = resolveSubject();

    if (!subject || !subject.length) {
      throw new Error(t('school.tasks.itemForm.errors.customMissing'));
    }
    if (subject.length > 100) {
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
    } else {
      await hw.post('/api/items', payload);
    }

    emit('success');

  } catch (e: unknown) {
    isError.value = true;

    const err = e as { response?: { status?: number, data?: { error?: string } }, message?: string };
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

const titleInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  imgInit(props.initial?.images || []);
  window.addEventListener('keydown', onKeyDown);
  titleInputRef.value?.focus();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <form @submit.prevent="submit" novalidate>
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
                    :src="img.thumbUrl || (img.url ? makeThumb(img.url) : '')"
                    class="thumb"
                    loading="lazy"
                    decoding="async"
                    alt="Vorschau"
                />
              </a>
              <div class="image-actions">
                <BaseButton type="button" class="image-remove" @click="removeImg(img, initial?.id)" variant="danger">X</BaseButton>
              </div>
            </div>

            <BaseButton type="button" @click="uploadImage(!!initial)" :disabled="imgUploading" variant="ghost" :loading="imgUploading">
        {{ t('school.tasks.items.menu.uploadImages') }}
      </BaseButton>
          </div>
          <div v-if="imgUploading" class="small">{{ t('school.tasks.itemForm.uploadingImage') }}</div>
          <div v-if="imgUploadError" class="small error">{{ imgUploadError }}</div>
        </div>
      </template>

      <template #actions>
        <div class="row actions">
          <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>

          <BaseButton type="button" @click="emit('cancel')" variant="ghost">
            {{ t('global.buttons.cancel') }}
          </BaseButton>

          <BaseButton type="submit" :disabled="submitting" variant="action" :loading="submitting">
        {{ initial ? t('global.buttons.save') : t('global.buttons.create') }}
      </BaseButton>
        </div>
      </template>
    </Modal>
  </form>
</template>

<style scoped>
.section {
  margin-top: 16px;
}
.top {
  gap: 16px;
}

.label {
  display: block;
  font-size: var(--text-btn);
  color: var(--color-on-surface);
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
  border-radius: var(--radius-md);
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
  font-size: var(--text-sub);
  color: var(--color-sub);
  align-self: center;
}
.error {
  color: var(--color-danger);
}
.msg-error {
  color: var(--color-danger);
}
</style>
