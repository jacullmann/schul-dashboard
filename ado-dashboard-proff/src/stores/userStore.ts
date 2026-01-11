import { defineStore } from 'pinia';
import { ref } from 'vue';
import hw from '../hwApi'; // Adjust this path based on your folder structure (e.g., '@/hwApi')
import { processImageBeforeUpload } from '../composables/useConvertImage'; // Adjust path as needed

export interface ImageItem {
    url: string;
    publicId: string;
    thumbUrl?: string;
    createdBy?: string;
}

export const useImageUploadStore = defineStore('imageUpload', () => {
    // --- State ---
    const images = ref<ImageItem[]>([]);
    const uploading = ref(false);
    const uploadError = ref('');

    // --- Actions ---

    /**
     * Initialize the store with existing images from the entry
     */
    function init(initialImages: ImageItem[] = []) {
        images.value = [...initialImages];
        uploading.value = false;
        uploadError.value = '';
    }

    /**
     * Helper to generate thumbnail URLs
     */
    function makeThumb(url: string) {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/');
            const uploadIdx = parts.findIndex(p => p === 'upload');
            if (uploadIdx !== -1) {
                parts.splice(uploadIdx + 1, 0, 'f_webp,q_auto:best,w_120');
                u.pathname = parts.join('/');
            }
            return u.toString();
        } catch {
            return url;
        }
    }

    /**
     * Handles the file input creation, validation, signing, and uploading to Cloudinary.
     * If itemId is provided, it immediately updates the item in the database.
     * @param isEditMode - Boolean indicating if we are editing an existing entry (affects max limits)
     * @param itemId - (Optional) The ID of the item. If present, the new images are saved to the backend immediately.
     */
    async function uploadImage(isEditMode: boolean, itemId?: string) {
        uploading.value = true;
        uploadError.value = '';

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;

        // Reset uploading state if user cancels
        input.oncancel = () => {
            uploading.value = false;
        };

        input.onchange = async () => {
            const files = Array.from(input.files || []);
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
                uploadError.value = `Die maximale Anzahl an Bilder (${MAX_IMAGES})  ${isEditMode ? '(gesamt)' : '(für neuen Eintrag)'} für diesen Eintrag wurden erreicht.`;
                uploading.value = false;
                return;
            }
            if (files.length > remaining) {
                uploadError.value = `Du kannst nur noch ${remaining} Bild(er) hochladen. Dein Limit: ${MAX_IMAGES} Bilder.`;
                uploading.value = false;
                return;
            }

            let newImagesAdded = false;

            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    console.warn(`Datei ${file.name} ist kein Bild und wird übersprungen.`);
                    continue;
                }

                try {
                    const processedFile = await processImageBeforeUpload(file);
                    const { data: sign } = await hw.post('/api/uploads/sign');
                    const form = new FormData();
                    form.set('file', processedFile);
                    form.set('api_key', sign.apiKey);
                    form.set('timestamp', String(sign.timestamp));
                    form.set('signature', sign.signature);
                    form.set('folder', sign.folder);

                    const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body: form });
                    const json = await res.json();

                    if (json.secure_url && json.public_id) {
                        images.value.push({
                            url: json.secure_url,
                            thumbUrl: makeThumb(json.secure_url),
                            publicId: json.public_id,
                            createdBy: ''
                        });
                        newImagesAdded = true;
                        uploadError.value = '';
                    } else {
                        uploadError.value = 'Einige Uploads konnten nicht durchgeführt werden.';
                        console.error('Upload failed for file', file, json);
                    }
                } catch (e: any) {
                    uploadError.value = 'Upload fehlgeschlagen für mindestens eine Datei.';
                    console.error('uploadImage error', e);
                }
            }

            // NEW LOGIC: Save changes to backend if we have an ID
            if (itemId && newImagesAdded) {
                try {
                    // Send the updated image list to the backend
                    await hw.patch(`/api/items/${itemId}`, {
                        images: images.value
                    });
                    // Optional: Indicate that saving was also successful
                    // uploadError.value = 'Bilder gespeichert.';
                } catch (e: any) {
                    console.error('Failed to patch item images:', e);
                    uploadError.value = 'Bilder hochgeladen, aber Speichern fehlgeschlagen.';
                }
            }

            uploading.value = false;
        };

        // Setze einen Timeout als Fallback für den Fall, dass oncancel nicht funktioniert
        setTimeout(() => {
            if (uploading.value) {
                if (!document.body.contains(input)) {
                    uploading.value = false;
                }
            }
        }, 3000);

        input.click();
    }

    /**
     * Removes an image from the list and deletes it from server if it belongs to an existing entry
     * @param img - The image object to remove
     * @param parentId - The ID of the parent entry (props.initial.id) if it exists
     */
    async function removeImg(img: { url: string; publicId: string }, parentId?: string) {
        if (parentId) {
            try {
                // encode publicId so slashes are safe in the URL
                await hw.delete(`/api/items/${parentId}/images/${encodeURIComponent(img.publicId)}`);

                // remove locally
                images.value = images.value.filter(i => i.publicId !== img.publicId);

                console.log('Bild erfolgreich gelöscht:', img.publicId);
                uploadError.value = 'Bild erfolgreich gelöscht.';
                setTimeout(() => uploadError.value = '', 3000);

            } catch (e: any) {
                console.error('Fehler beim Löschen des Bildes:', e);
                uploadError.value = 'Fehler beim Löschen des Bildes.';
            }
        } else {
            images.value = images.value.filter(i => i.publicId !== img.publicId);
        }
    }

    return {
        images,
        uploading,
        uploadError,
        init,
        makeThumb,
        uploadImage,
        removeImg
    };
});