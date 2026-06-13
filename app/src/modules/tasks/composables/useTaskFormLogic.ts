import { onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import hw from '../../../api/api';
import type { HwItem } from '@/modules/tasks/composables/useTasks';
import type { ItemType } from '@/modules/tasks/types';
import { useImageUpload } from '@/modules/tasks/composables/useImageUpload';
import { useI18n } from 'vue-i18n';
import { getSubjectKey } from '@/types/subjects';
import { useSubjectStore } from '@/stores/subjectStore';
import { formatSubjectDisplay } from '@/utils/subject-formatter';

export function useTaskFormLogic(
  initial: HwItem | null | undefined,
  initialType: Exclude<ItemType, 'all'> | undefined,
  emit: {
    (e: 'cancel'): void;
    (e: 'success'): void;
  },
) {
  const i18n = useI18n();
  const route = useRoute();
  const router = useRouter();
  const t = (key: string, named?: Record<string, any>) =>
    i18n.t(key, named || {});
  const te = (key: string) => i18n.te(key);

  const subjectStore = useSubjectStore();

  const typeTabItems = computed(() => [
    { id: 'homework', label: t('tasks.list.types.homework') },
    { id: 'dalton', label: t('tasks.list.types.dalton') },
    { id: 'exam', label: t('tasks.list.types.exam') },
  ]);

  const activeType = ref<Exclude<ItemType, 'all'>>(
    initial ? initial.type : (initialType ?? 'homework'),
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
    makeUrl,
  } = useImageUpload();

  const isPdf = (img: any) => img.metadata?.format === 'pdf';

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

    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf',
    );
    if (validFiles.length === 0) return;

    await uploadFiles(validFiles, !!initial, initial?.id);
  };

  const getInitialSubjectParts = () => {
    const initSub = initial?.subject;
    if (!initSub) return { main: '', course: '' };

    const parts = initSub.split(' - ');
    if (parts.length === 2) {
      const main = parts[0]!.trim();
      const course = parts[1]!.trim();
      const subject = subjectStore.subjects.find((s) => s.name === main);
      if (subject && subject.courses && subject.courses.length > 0) {
        return { main, course };
      }
    }
    return { main: initSub, course: '' };
  };

  const initialParts = getInitialSubjectParts();

  const title = ref(initial?.title || '');
  const subjectSel = ref(initialParts.main);
  const subjectOther = ref('');
  const description = ref(initial?.description || '');
  const courseSel = ref(initialParts.course);

  const titleError = ref('');
  const subjectError = ref('');
  const courseError = ref('');
  const subjectOtherError = ref('');
  const descriptionError = ref('');
  const dueDateError = ref('');

  const showDoubleTaskConfirm = ref(false);
  const doubleTaskOriginalItem = ref<HwItem | null>(null);
  const doubleCheckPassed = ref(false);

  const getSubjectName = (subject: string) =>
    formatSubjectDisplay(subject, t, te);

  const getTypeLabel = (type: string) => {
    if (type === 'homework') return t('tasks.list.types.homework');
    if (type === 'dalton') return t('tasks.list.types.dalton');
    if (type === 'exam') return t('tasks.list.types.exam');
    return type;
  };

  const formattedDueDate = computed(() => {
    try {
      if (!dueLocal.value) return '';
      return new Date(dueLocal.value).toLocaleDateString();
    } catch {
      return dueLocal.value;
    }
  });

  const doubleTaskSubjectName = computed(() => {
    if (!doubleTaskOriginalItem.value) return '';
    return getSubjectName(doubleTaskOriginalItem.value.subject);
  });

  const doubleTaskTypeLabel = computed(() => {
    if (!doubleTaskOriginalItem.value) return '';
    return getTypeLabel(doubleTaskOriginalItem.value.type);
  });

  const doubleTaskDueDate = computed(() => {
    if (!doubleTaskOriginalItem.value) return '';
    try {
      return new Date(
        doubleTaskOriginalItem.value.dueDate,
      ).toLocaleDateString();
    } catch {
      return doubleTaskOriginalItem.value.dueDate;
    }
  });

  const doubleTaskConfirmMessage = computed(() => {
    if (!doubleTaskOriginalItem.value) return '';
    return t('tasks.list.double_task_confirm.message', {
      date: formattedDueDate.value,
      type: getTypeLabel(activeType.value),
      subject: doubleTaskSubjectName.value,
    });
  });

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
    initial?.dueDate
      ? isoDateOnlyFromIso(initial.dueDate)
      : new Date().toISOString().slice(0, 10),
  );

  watch([activeType, subjectSel, subjectOther, courseSel, dueLocal], () => {
    doubleCheckPassed.value = false;
  });

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
    return courseName
      .replace(/^Herr\s+/, `${mr} `)
      .replace(/^Frau\s+/, `${ms} `);
  };

  const selectedSubjectHasCourses = computed(() => {
    const match = subjectStore.subjects.find(
      (s) => s.name === subjectSel.value,
    );
    if (!match || !match.courses) return false;
    if (match.category === 'core') return false;
    if (match.category === 'extra') return match.courses.length >= 2;
    return match.courses.length >= 1;
  });

  const courseOptions = computed(() => {
    const match = subjectStore.subjects.find(
      (s) => s.name === subjectSel.value,
    );
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
      subjectError.value = t('tasks.list.task_form.errors.custom_missing');
      hasValidationErrors = true;
    } else if (main === '__OTHER__') {
      finalSubject = subjectOther.value.trim();
      if (!finalSubject) {
        subjectOtherError.value = t(
          'tasks.list.task_form.errors.custom_missing',
        );
        hasValidationErrors = true;
      } else if (finalSubject.length > 100) {
        subjectOtherError.value = t('tasks.list.task_form.errors.custom_long');
        hasValidationErrors = true;
      }
    } else if (selectedSubjectHasCourses.value) {
      if (!courseSel.value) {
        const translationKey = `common.subjects.${main}`;
        const courseName = te(translationKey) ? t(translationKey) : main;
        courseError.value = t('tasks.list.task_form.errors.course_missing', {
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
      titleError.value = t('tasks.list.task_form.errors.title_missing');
      hasValidationErrors = true;
    } else if (cleanTitle.length > 60) {
      titleError.value = t('tasks.list.task_form.errors.title_long');
      hasValidationErrors = true;
    }

    const cleanDesc = description.value.trim();
    if (cleanDesc.length > 10000000000000000000000000000000) {
      descriptionError.value = t(
        'tasks.list.task_form.errors.description_long',
      );
      hasValidationErrors = true;
    }

    const selectedDate = new Date(dueLocal.value);
    selectedDate.setHours(23, 59, 0, 0);

    if (selectedDate < minDate) {
      dueDateError.value = t('tasks.list.task_form.errors.date_old');
      hasValidationErrors = true;
    } else if (selectedDate > maxDate) {
      dueDateError.value = t('tasks.list.task_form.errors.date_new');
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

      if (initial) {
        await hw.patch(`/items/${initial.id}`, payload);
      } else {
        await hw.post('/items', {
          ...payload,
          type: activeType.value,
          confirmDoubleTask: doubleCheckPassed.value,
        });
      }

      emit('success');
    } catch (e: unknown) {
      const err = e as {
        response?: {
          status?: number;
          data?: { error?: string; code?: string; item?: HwItem };
        };
        message?: string;
      };

      if (
        err.response?.status === 409 &&
        err.response?.data?.code === 'DUPLICATE_ITEM'
      ) {
        doubleTaskOriginalItem.value = err.response.data.item || null;
        showDoubleTaskConfirm.value = true;
        submitting.value = false;
        return;
      } else if (err.response?.status === 400) {
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

  async function confirmDoubleTaskSubmit() {
    doubleCheckPassed.value = true;
    showDoubleTaskConfirm.value = false;
    await submit();
  }

  function viewExisting() {
    if (!doubleTaskOriginalItem.value) return;
    showDoubleTaskConfirm.value = false;
    emit('cancel');
    void router.push({
      name: 'group-tasks',
      params: { groupId: route.params.groupId as string },
      query: {
        type: doubleTaskOriginalItem.value.type,
        itemId: doubleTaskOriginalItem.value.id,
      },
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (showDoubleTaskConfirm.value) {
        showDoubleTaskConfirm.value = false;
      } else {
        emit('cancel');
      }
    }
  }

  const titleInputRef = ref<any>(null);

  useEventListener(window, 'keydown', onKeyDown);

  onMounted(() => {
    void subjectStore.loadSubjects();
    imgInit(initial?.images || []);
    titleInputRef.value?.focus();
  });

  return {
    t,
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
  };
}
