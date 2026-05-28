import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import { processImageBeforeUpload } from '@/modules/tasks/composables/useConvertImage';
import type { ImageItem } from '@/modules/tasks/types';

export type { ImageItem };

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;

const images = ref<ImageItem[]>([]);
const uploading = ref(false);
const uploadError = ref('');
const uploadSuccess = ref(false);

function buildCloudinaryUrl(publicId: string, transform: string): string {
  const isPdf = publicId.toLowerCase().endsWith('.pdf');
  const effectivePublicId = isPdf
      ? publicId.replace(/\.pdf$/i, '.jpg')
      : publicId;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${effectivePublicId}`;
}

export function makeThumb(input?: string): string {
  if (!input) return '';

  if (input.startsWith('http')) {
    try {
      const u = new URL(input);
      const parts = u.pathname.split('/');
      const uploadIdx = parts.findIndex((p) => p === 'upload');
      if (uploadIdx !== -1) {
        const isPdf = u.pathname.toLowerCase().endsWith('.pdf');
        const transform = isPdf
            ? 'f_auto,q_auto,w_256,h_256,c_fill,pg_1'
            : 'f_webp,q_auto,w_256,h_256,c_fill';
        parts.splice(uploadIdx + 1, 0, transform);
        if (isPdf) u.pathname = u.pathname.replace(/\.pdf$/i, '.jpg');
        u.pathname = parts.join('/');
      }
      return u.toString();
    } catch {
      return input;
    }
  }

  const isPdf = input.toLowerCase().endsWith('.pdf');

  const transform = isPdf
      ? 'f_auto,q_auto,w_256,h_256,c_fill,pg_1'
      : 'f_webp,q_auto,w_256,h_256,c_fill';
  return buildCloudinaryUrl(input, transform);
}

export function makeUrl(input?: string): string {
  if (!input) return '';

  if (input.startsWith('http')) return input;

  return buildCloudinaryUrl(input, 'f_webp,q_auto');
}

export function useImageUpload() {
  const { t } = useI18n();

  function init(initialImages: ImageItem[] = []) {
    images.value = [...initialImages];
    uploading.value = false;
    uploadError.value = '';
    uploadSuccess.value = false;
  }

  async function uploadFiles(
      files: File[],
      isEditMode: boolean,
      itemId?: string,
  ) {
    if (files.length === 0) return;

    uploading.value = true;
    uploadError.value = '';
    uploadSuccess.value = false;

    const TOTAL_MAX_IMAGES = 12;
    const PER_USER_MAX_IMAGES = 8;
    const MAX_IMAGES = isEditMode ? TOTAL_MAX_IMAGES : PER_USER_MAX_IMAGES;

    const remaining = MAX_IMAGES - (images.value || []).length;

    if (remaining <= 0) {
      uploadError.value = `Limit erreicht. Maximale Bilder: ${MAX_IMAGES}`;
      uploading.value = false;
      return;
    }

    const validFilesList: File[] = [];
    for (const f of files) {
      if (f.type.startsWith('image/')) {
        validFilesList.push(f);
      } else if (f.type === 'application/pdf') {
        if (f.size > 5 * 1024 * 1024) {
          uploadError.value = 'PDF-Dateien dürfen maximal 5 MB groß sein.';
          uploading.value = false;
          return;
        }
        validFilesList.push(f);
      }
    }

    const slicedFiles = validFilesList.slice(0, remaining);

    if (slicedFiles.length === 0) {
      uploading.value = false;
      return;
    }

    if (slicedFiles.length > PER_USER_MAX_IMAGES) {
      uploadError.value = `Maximal ${PER_USER_MAX_IMAGES} Bilder pro Upload erlaubt.`;
      uploading.value = false;
      return;
    }

    try {
      const processedFiles = await Promise.all(
          slicedFiles.map(processImageBeforeUpload),
      );

      const uploadTasks = processedFiles.map(async (processedFile) => {
        const { data: sign } = await hw.post('/items/uploads/sign');
        const form = new FormData();
        form.set('file', processedFile);
        form.set('api_key', sign.apiKey);
        form.set('timestamp', String(sign.timestamp));
        form.set('signature', sign.signature);
        form.set('folder', sign.folder);

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
            { method: 'POST', body: form },
        );

        if (!res.ok) throw new Error('Cloudinary Upload failed');
        const json = await res.json();

        if (!json.secure_url || !json.public_id)
          throw new Error('Invalid upload response');

        const metadata = {
          version: json.version,
          format: json.format,
          width: json.width,
          height: json.height,
        };

        const imgPayload = { publicId: json.public_id, metadata };

        if (itemId) {
          const { data } = await hw.post(`/items/${itemId}/images`, {
            image: imgPayload,
          });
          images.value.push(data.image);
        } else {
          images.value.push({
            publicId: json.public_id,
            url: json.secure_url,
            thumbUrl: makeThumb(json.public_id),
            createdBy: '',
            metadata,
          });
        }
      });

      const results = await Promise.allSettled(uploadTasks);
      const failures = results.filter((r) => r.status === 'rejected');

      if (failures.length > 0) {
        uploadError.value = 'Einige Bilder konnten nicht hochgeladen werden.';
      } else {
        uploadSuccess.value = true;
      }
    } catch (e: any) {
      uploadError.value = e.message || 'Fehler beim Upload.';
    } finally {
      uploading.value = false;
    }
  }

  async function uploadImage(isEditMode: boolean, itemId?: string) {
    uploading.value = true;
    uploadError.value = '';
    uploadSuccess.value = false;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.multiple = true;

    input.oncancel = () => {
      uploading.value = false;
    };

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      await uploadFiles(files, isEditMode, itemId);
    };

    input.click();
  }

  async function removeImg(
      img: { publicId: string; url?: string },
      parentId?: string,
  ) {
    if (parentId) {
      try {
        await hw.delete(
            `/items/${parentId}/images/${encodeURIComponent(img.publicId)}`,
        );
        images.value = images.value.filter((i) => i.publicId !== img.publicId);
        uploadError.value = t('tasks.images.delete_modal.success');
        setTimeout(() => (uploadError.value = ''), 3000);
      } catch {
        uploadError.value = t('tasks.images.delete_modal.error');
      }
    } else {
      images.value = images.value.filter((i) => i.publicId !== img.publicId);
    }
  }

  return {
    images,
    uploading,
    uploadError,
    uploadSuccess,
    init,
    makeThumb,
    makeUrl,
    uploadImage,
    uploadFiles,
    removeImg,
  };
}
