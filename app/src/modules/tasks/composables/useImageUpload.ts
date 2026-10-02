import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import { groupPath } from '@/api/groupPath';
import {
  rawExtensionOf,
  uploadToCloudinary,
  type UploadSignature,
} from '@/api/cloudinary';
import { processImageBeforeUpload } from '@/modules/tasks/composables/useConvertImage';
import { useToast } from '@/common/composables/useToast';
import { useUserStore } from '@/stores/userStore';
import type { HwItem, ImageItem } from '@/modules/tasks/types';
import {
  imageQuotaViolation,
  type HeldImages,
  type ImageQuotaViolation,
} from '@/modules/tasks/utils/imageQuota';

export type { ImageItem };

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const BYTES_PER_MB = 1024 * 1024;
// Images are measured after compression, so a large phone photo still fits;
// documents are uploaded as they are and get more room.
const MAX_IMAGE_BYTES = 2 * BYTES_PER_MB;
const MAX_DOCUMENT_BYTES = 5 * BYTES_PER_MB;

const isImage = (file: File) => file.type.startsWith('image/');
const maxBytesOf = (file: File) =>
  isImage(file) ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;

const images = ref<ImageItem[]>([]);
const uploading = ref(false);
const uploadError = ref('');
const uploadSuccess = ref(false);

export async function extractOfficeThumbnail(file: File): Promise<File | null> {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(file);
    const possiblePaths = [
      'docProps/thumbnail.jpeg',
      'docProps/thumbnail.jpg',
      'docProps/thumbnail.png',
      'docProps/thumbnail.wmf',
      'docProps/thumbnail.emf',
    ];

    for (const path of possiblePaths) {
      const zipFile = zip.file(path);
      if (zipFile) {
        const blob = await zipFile.async('blob');
        let mimeType = 'image/jpeg';
        let extension = 'jpg';
        if (path.endsWith('.png')) {
          mimeType = 'image/png';
          extension = 'png';
        } else if (path.endsWith('.wmf')) {
          mimeType = 'image/x-wmf';
          extension = 'wmf';
        } else if (path.endsWith('.emf')) {
          mimeType = 'image/x-emf';
          extension = 'emf';
        }

        if (extension === 'wmf' || extension === 'emf') {
          console.warn(
            `Extracted thumbnail is in ${extension.toUpperCase()} format, which is not supported by browsers.`,
          );
          return null;
        }

        return new File([blob], `thumbnail.${extension}`, { type: mimeType });
      }
    }
  } catch (error) {
    console.error('Failed to extract Office thumbnail:', error);
  }
  return null;
}

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

export function makeRawUrl(input?: string): string {
  if (!input) return '';
  if (input.startsWith('http')) return input;
  return `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${input}`;
}

/** Uploads attach to items of the current `groupId`. */
export function useImageUpload(groupId: MaybeRefOrGetter<string>) {
  const { t } = useI18n();
  const toast = useToast();
  const userStore = useUserStore();

  function failUpload(message: string) {
    uploadError.value = message;
    uploading.value = false;
    toast.error(message);
  }

  function init(initialImages: ImageItem[] = []) {
    images.value = [...initialImages];
    uploading.value = false;
    uploadError.value = '';
    uploadSuccess.value = false;
  }

  /** Without an `itemId` the images belong to a task not created yet. */
  function heldImages(itemId?: string): HeldImages {
    const total = images.value.length;
    if (!itemId) return { own: total, total };

    const userId = userStore.user?.id;
    const own = images.value.filter((img) => img.createdBy === userId).length;
    return { own, total };
  }

  function quotaMessage({ limit, max, remaining }: ImageQuotaViolation) {
    const scope = limit === 'perUploader' ? 'own' : 'task';
    return remaining === 0
      ? t(`tasks.images.upload.quota.${scope}_reached`, { max })
      : t(`tasks.images.upload.quota.${scope}_exceeded`, { max, remaining });
  }

  async function uploadFiles(
    files: File[],
    itemType: HwItem['type'],
    itemId?: string,
  ) {
    if (files.length === 0) return;

    uploading.value = true;
    uploadError.value = '';
    uploadSuccess.value = false;

    const validFilesList: File[] = [];
    for (const f of files) {
      if (isImage(f) || f.type === 'application/pdf') {
        validFilesList.push(f);
      } else if (
        f.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.type ===
          'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        f.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        /\.(docx|pptx|xlsx)$/i.test(f.name)
      ) {
        validFilesList.push(f);
      }
    }

    if (validFilesList.length === 0) {
      uploading.value = false;
      return;
    }

    // A selection that does not fit is rejected as a whole rather than cut
    // down, so the member decides which files to leave out.
    const violation = imageQuotaViolation(
      itemType,
      heldImages(itemId),
      validFilesList.length,
    );
    if (violation) {
      failUpload(quotaMessage(violation));
      return;
    }

    // Every file is prepared and measured before the first upload starts, so
    // one oversized file stops the whole selection like the quota does.
    const prepared = await Promise.all(
      validFilesList.map(async (original) => ({
        original,
        file: await processImageBeforeUpload(original),
      })),
    );
    const oversized = prepared.find(({ file }) => file.size > maxBytesOf(file));
    if (oversized) {
      failUpload(
        t('tasks.images.upload.file_too_large', {
          name: oversized.original.name,
          max: maxBytesOf(oversized.file) / BYTES_PER_MB,
        }),
      );
      return;
    }
    const preparedFiles = prepared.map(({ file }) => file);

    const progressToast = toast.progress(
      t('tasks.images.upload.progress'),
      preparedFiles.length,
    );

    try {
      const uploadFile = async (file: File) => {
        const ext = rawExtensionOf(file.name);

        if (ext) {
          let thumbnailId: string | null = null;

          // 1. Try to extract thumbnail client-side
          try {
            const thumbFile = await extractOfficeThumbnail(file);
            if (thumbFile) {
              const processedThumb = await processImageBeforeUpload(thumbFile);
              const { data: sign } = await hw.post<UploadSignature>(
                groupPath(toValue(groupId), '/items/uploads/sign'),
                {},
              );

              let json;
              if (sign.cloudName === 'mock_cloud') {
                // Mock image upload in development
                json = {
                  secure_url:
                    'http://localhost:3000/mock/upload/worksheet-mathe.svg',
                  public_id: 'mock_office_thumbnail_id',
                  version: 1,
                  format: 'svg',
                };
              } else {
                json = await uploadToCloudinary(sign, processedThumb);
              }

              if (json && json.public_id) {
                thumbnailId = json.public_id;
              }
            }
          } catch (err) {
            console.warn(
              'Failed to extract/upload thumbnail, proceeding without thumbnail:',
              err,
            );
          }

          // 2. Upload the original Office file as a RAW resource
          const { data: sign } = await hw.post<UploadSignature>(
            groupPath(toValue(groupId), '/items/uploads/sign'),
            { rawExtension: ext },
          );
          let json;

          if (sign.cloudName === 'mock_cloud') {
            // Mock raw upload in development
            json = {
              secure_url: `http://localhost:3000/mock/upload/worksheet-pdf.pdf`, // Fallback preview url for localhost dev mode
              public_id: `mock_office_file_id.${ext}`,
              version: 1,
            };
          } else {
            json = await uploadToCloudinary(sign, file, 'raw');
          }

          if (!json.secure_url || !json.public_id)
            throw new Error('Invalid raw upload response');

          const metadata = {
            version: json.version,
            format: ext,
            thumbnailId,
            name: file.name,
          };

          const imgPayload = { publicId: json.public_id, metadata };

          if (itemId) {
            const { data } = await hw.post(
              groupPath(toValue(groupId), `/items/${itemId}/images`),
              {
                image: imgPayload,
              },
            );
            images.value.push(data.image);
          } else {
            images.value.push({
              publicId: json.public_id,
              url: json.secure_url,
              thumbUrl: thumbnailId ? makeThumb(thumbnailId) : '',
              createdBy: '',
              metadata,
            });
          }
        } else {
          const { data: sign } = await hw.post<UploadSignature>(
            groupPath(toValue(groupId), '/items/uploads/sign'),
            {},
          );

          let json;
          if (sign.cloudName === 'mock_cloud') {
            // Mock standard image upload in development
            const isPdf = file.type === 'application/pdf';
            json = {
              secure_url: isPdf
                ? 'http://localhost:3000/mock/upload/worksheet-pdf.pdf'
                : 'http://localhost:3000/mock/upload/worksheet-mathe.svg',
              public_id: isPdf
                ? 'http://localhost:3000/mock/upload/worksheet-pdf.pdf'
                : 'http://localhost:3000/mock/upload/worksheet-mathe.svg',
              version: 1,
              format: isPdf ? 'pdf' : 'svg',
              width: 800,
              height: 600,
            };
          } else {
            json = await uploadToCloudinary(sign, file);
          }

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
            const { data } = await hw.post(
              groupPath(toValue(groupId), `/items/${itemId}/images`),
              {
                image: imgPayload,
              },
            );
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
        }
      };

      const results = await Promise.allSettled(
        preparedFiles.map((file) =>
          uploadFile(file).finally(() => progressToast.increment()),
        ),
      );

      const uploaded = results.filter((r) => r.status === 'fulfilled').length;

      if (uploaded === preparedFiles.length) {
        uploadSuccess.value = true;
        progressToast.settle(t('tasks.images.upload.success'));
      } else if (uploaded > 0) {
        uploadError.value = t('tasks.images.upload.partial', {
          uploaded,
          total: preparedFiles.length,
        });
        progressToast.settle(uploadError.value, { type: 'warning' });
      } else {
        uploadError.value = t('tasks.images.upload.failed');
        progressToast.settle(uploadError.value, { type: 'error' });
      }
    } catch (e: any) {
      uploadError.value = e.message || t('tasks.images.upload.failed');
      progressToast.settle(uploadError.value, { type: 'error' });
    } finally {
      uploading.value = false;
    }
  }

  function uploadImage(itemType: HwItem['type'], itemId?: string) {
    uploading.value = true;
    uploadError.value = '';
    uploadSuccess.value = false;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf,.docx,.pptx,.xlsx';
    input.multiple = true;

    input.oncancel = () => {
      uploading.value = false;
    };

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      await uploadFiles(files, itemType, itemId);
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
          groupPath(
            toValue(groupId),
            `/items/${parentId}/images/${encodeURIComponent(img.publicId)}`,
          ),
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
