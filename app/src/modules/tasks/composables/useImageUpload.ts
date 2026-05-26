import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/hwApi';
import { processImageBeforeUpload } from '@/modules/tasks/composables/useConvertImage';
import type { ImageItem } from '@/modules/tasks/types';

export type { ImageItem };

const images = ref<ImageItem[]>([]);
const uploading = ref(false);
const uploadError = ref('');
const uploadSuccess = ref(false);

export function useImageUpload() {
  const { t } = useI18n();
  function init(initialImages: ImageItem[] = []) {
    images.value = [...initialImages];
    uploading.value = false;
    uploadError.value = '';
    uploadSuccess.value = false;
  }

  function makeThumb(url?: string) {
    if (!url) return '';
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const uploadIdx = parts.findIndex((p) => p === 'upload');
      if (uploadIdx !== -1) {
        parts.splice(uploadIdx + 1, 0, 'f_webp,q_auto,w_256,h_256,c_fill');
        u.pathname = parts.join('/');
      }
      return u.toString();
    } catch {
      return url;
    }
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

    const validFiles = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remaining);

    if (validFiles.length > PER_USER_MAX_IMAGES) {
      uploadError.value = `Maximal ${PER_USER_MAX_IMAGES} Bilder pro Upload erlaubt.`;
      uploading.value = false;
      return;
    }

    try {
      const processedFiles = await Promise.all(
        validFiles.map(processImageBeforeUpload),
      );

      const uploadTasks = processedFiles.map(async (processedFile) => {
        const { data: sign } = await hw.post('/api/items/uploads/sign');
        const form = new FormData();
        form.set('file', processedFile);
        form.set('api_key', sign.apiKey);
        form.set('timestamp', String(sign.timestamp));
        form.set('signature', sign.signature);
        form.set('folder', sign.folder);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
          {
            method: 'POST',
            body: form,
          },
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
          const { data } = await hw.post(`/api/items/${itemId}/images`, {
            image: imgPayload,
          });
          images.value.push(data.image);
        } else {
          images.value.push({
            publicId: json.public_id,
            url: json.secure_url,
            thumbUrl: makeThumb(json.secure_url),
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
    input.accept = 'image/*';
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
          `/api/items/${parentId}/images/${encodeURIComponent(img.publicId)}`,
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
    uploadImage,
    uploadFiles,
    removeImg,
  };
}
