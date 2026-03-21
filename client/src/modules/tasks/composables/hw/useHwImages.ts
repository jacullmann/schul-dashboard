import { ref, reactive } from 'vue';
import type { Ref } from 'vue';
import type { HwItem, ImageItem } from '@/modules/tasks/types';

import { useToast } from '@/common/composables/useToast';

export function useHwImages(
    user: Ref<Record<string, unknown> | null>,
    imageUpload: ReturnType<typeof import('@/modules/tasks/composables/useImageUpload').useImageUpload>,
    refreshItem: (itemId: string, onUpdate?: (item: HwItem) => void) => Promise<void>
) {
    const showImageViewer = ref(false);
    const viewerImages = ref<HwItem['images']>([]);
    const viewerStartIndex = ref(0);

    const imageMenu = reactive({
        visible: false,
        x: 0,
        y: 0,
        item: null as HwItem | null,
        image: null as ImageItem | null,
    });

    const showImageDeleteConfirm = ref(false);
    const deletingImage = ref(false);
    const currentUploadItemId = ref<string | null>(null);

    function openImageViewer(item: HwItem, index: number) {
        viewerImages.value = item.images;
        viewerStartIndex.value = index;
        showImageViewer.value = true;
    }

    function closeImageViewer() {
        showImageViewer.value = false;
        setTimeout(() => {
            viewerImages.value = [];
            viewerStartIndex.value = 0;
        }, 300);
    }

    function handleImageContextMenu(event: MouseEvent, item: HwItem, img: ImageItem) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
        openImageMenu(event, item, img);
    }

    function openImageMenu(event: MouseEvent, item: HwItem, img: ImageItem) {
        if (!user.value) return;
        imageMenu.item = item;
        imageMenu.image = img;
        imageMenu.x = event.clientX;
        imageMenu.y = event.clientY;
        imageMenu.visible = true;
        imageUpload.init(item.images);
    }

    function closeImageMenu() {
        imageMenu.visible = false;
        imageMenu.item = null;
        imageMenu.image = null;
    }

    function triggerImageUpload(item?: HwItem) {
        const targetItem = item || imageMenu.item;
        if (!targetItem) return;

        imageUpload.init(targetItem.images);
        currentUploadItemId.value = targetItem.id;
        imageUpload.uploadImage(true, targetItem.id);
        closeImageMenu();
    }

    function triggerImageDrop(item: HwItem, files: File[]) {
        if (!item || !files.length) return;

        imageUpload.init(item.images);
        currentUploadItemId.value = item.id;
        imageUpload.uploadFiles(files, true, item.id);
    }

    function triggerImageDelete() {
        showImageDeleteConfirm.value = true;
        imageMenu.visible = false;
    }

    async function confirmImageDelete() {
        if (!imageMenu.image || !imageMenu.item || deletingImage.value) return;

        deletingImage.value = true;
        try {
            await imageUpload.removeImg(imageMenu.image, imageMenu.item.id);
            await refreshItem(imageMenu.item.id, (newData) => {
                if (imageMenu.item?.id === newData.id) {
                    imageMenu.item = newData;
                }
            });
            useToast().success('Bild gelöscht.', 3000);
            showImageDeleteConfirm.value = false;
            imageMenu.image = null;
            imageMenu.item = null;
        } catch {
            useToast().error('Fehler beim Löschen des Bildes.', 4000);
        } finally {
            deletingImage.value = false;
        }
    }

    function cancelImageDelete() {
        showImageDeleteConfirm.value = false;
        imageMenu.image = null;
        imageMenu.item = null;
    }

    function makeThumb(url: string) {
        return imageUpload.makeThumb(url);
    }

    return {
        showImageViewer,
        viewerImages,
        viewerStartIndex,
        imageMenu,
        showImageDeleteConfirm,
        deletingImage,
        currentUploadItemId,
        openImageViewer,
        closeImageViewer,
        handleImageContextMenu,
        openImageMenu,
        closeImageMenu,
        triggerImageUpload,
        triggerImageDrop,
        triggerImageDelete,
        confirmImageDelete,
        cancelImageDelete,
        makeThumb
    };
}
