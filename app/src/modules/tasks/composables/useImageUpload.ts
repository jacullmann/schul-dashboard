import { ref } from 'vue';
import hw from '@/api/hwApi';
import { processImageBeforeUpload } from '@/modules/tasks/composables/useConvertImage';
import type { ImageItem } from '@/modules/tasks/types';

export type { ImageItem };

// Module-level state so all callers share the same instance (mirrors Pinia store behaviour)
const images = ref<ImageItem[]>([]);
const uploading = ref(false);
const uploadError = ref('');
const uploadSuccess = ref(false);

export function useImageUpload() {
  // --- Actions ---

  /**
   * Initialize the composable with existing images from the entry
   */
  function init(initialImages: ImageItem[] = []) {
    images.value = [...initialImages];
    uploading.value = false;
    uploadError.value = '';
    uploadSuccess.value = false;
  }

  /**
   * Helper to generate thumbnail URLs from a full Cloudinary URL
   */
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

  /**
   * Upload an array of files. Can be called directly (e.g., from drag & drop).
   * @param files - Array of File objects to upload
   * @param isEditMode - Boolean indicating if we are editing an existing entry (affects max limits)
   * @param itemId - (Optional) The ID of the item. If present, the new images are saved to the backend immediately.
   */
  async function uploadFiles(
    files: File[],
    isEditMode: boolean,
    itemId?: string,
  ) {
    uploading.value = true;
    uploadError.value = '';
    uploadSuccess.value = false;

    if (files.length === 0) {
      uploading.value = false;
      return;
    }

    const TOTAL_MAX_IMAGES = 12;
    const PER_USER_MAX_IMAGES = 8;
    const MAX_IMAGES = isEditMode ? TOTAL_MAX_IMAGES : PER_USER_MAX_IMAGES;

    const existingCount = (images.value || []).length;
    const remaining = MAX_IMAGES - existingCount;

    if (remaining <= 0) {
      uploadError.value = `Limit erreicht. Maximale Bilder: ${MAX_IMAGES}`;
      uploading.value = false;
      return;
    }
    if (files.length > remaining) {
      uploadError.value = `Zu viele Dateien ausgewählt. Du kannst noch ${remaining} Bild(er) hochladen.`;
      uploading.value = false;
      return;
    }
    // Enforce per-upload limit to prevent backend rejection if batch > user limit
    if (files.length > PER_USER_MAX_IMAGES) {
      uploadError.value = `Maximal ${PER_USER_MAX_IMAGES} Bilder pro Upload erlaubt.`;
      uploading.value = false;
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      try {
        // 1. Prepare and Upload to Cloudinary
        const processedFile = await processImageBeforeUpload(file);
        const { data: sign } = await hw.post('/api/items/uploads/sign');
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
        const json = await res.json();

        if (json.secure_url && json.public_id) {
          const metadata = {
            version: json.version,
            format: json.format,
            width: json.width,
            height: json.height,
          };

          const imgPayload = {
            publicId: json.public_id,
            metadata,
          };

          // 2. If we have an itemId, save to backend immediately using the correct POST route
          if (itemId) {
            try {
              const { data } = await hw.post(`/api/items/${itemId}/images`, {
                image: imgPayload,
              });
              // Add the returned image (with correct createdBy + dynamically built URLs) to local state
              images.value.push(data.image);
              uploadError.value = '';
              uploadSuccess.value = true;
            } catch (e: unknown) {
              console.error('Failed to save image to item:', e);
              const err = e as { response?: { data?: { error?: string } } };
              uploadError.value =
                err.response?.data?.error || 'Speichern fehlgeschlagen.';
            }
          } else {
            // Creating a new item: add to local state with preview URLs
            images.value.push({
              publicId: json.public_id,
              url: json.secure_url,
              thumbUrl: makeThumb(json.secure_url),
              createdBy: '',
              metadata,
            });
            uploadSuccess.value = true;
          }
        } else {
          console.error('Cloudinary Upload failed', json);
          uploadError.value = 'Upload in die Cloud fehlgeschlagen.';
        }
      } catch (e: unknown) {
        console.error('uploadFiles error', e);
        uploadError.value = 'Fehler beim Upload.';
      }
    }
    uploading.value = false;
  }

  /**
   * Handles the file input creation, validation, signing, and uploading to Cloudinary.
   * If itemId is provided, it immediately pushes the backend via POST.
   * @param isEditMode - Boolean indicating if we are editing an existing entry (affects max limits)
   * @param itemId - (Optional) The ID of the item. If present, the new images are saved to the backend immediately.
   */
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

  /**
   * Removes an image from the list and deletes it from the server if it belongs to an existing entry.
   * @param img - The image object to remove
   * @param parentId - The ID of the parent entry (props.initial.id) if it exists
   */
  async function removeImg(
    img: { publicId: string; url?: string },
    parentId?: string,
  ) {
    if (parentId) {
      try {
        // encode publicId so slashes are safe in the URL
        await hw.delete(
          `/api/items/${parentId}/images/${encodeURIComponent(img.publicId)}`,
        );

        // remove locally
        images.value = images.value.filter((i) => i.publicId !== img.publicId);

        uploadError.value = 'Bild erfolgreich gelöscht.';
        setTimeout(() => (uploadError.value = ''), 3000);
      } catch (e: unknown) {
        console.error('Fehler beim Löschen des Bildes:', e);
        uploadError.value = 'Fehler beim Löschen des Bildes.';
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
