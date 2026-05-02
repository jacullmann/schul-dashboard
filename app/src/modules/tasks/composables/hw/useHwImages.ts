import { ref, reactive } from 'vue';
import type { HwItem, ImageItem } from '@/modules/tasks/types';
import { useModalStore } from '@/stores/modalStore';
import { useToast } from '@/common/composables/useToast';
import type { HwContext } from './types';

export function useHwImages(ctx: HwContext, imageUpload: any) {
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

  const modalStore = useModalStore();
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

  function handleImageContextMenu(
    event: MouseEvent,
    item: HwItem,
    img: ImageItem,
  ) {
    openImageMenu(event, item, img);
  }

  function openImageMenu(event: MouseEvent, item: HwItem, img: ImageItem) {
    if (!ctx.user.value) return;
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

  async function triggerImageDelete() {
    if (!imageMenu.image || !imageMenu.item || deletingImage.value) return;

    const targetImage = imageMenu.image;
    const targetItem = imageMenu.item;

    closeImageMenu();

    const isConfirmed = await modalStore.confirm({
      title: 'Dieses Bild löschen?',
      content: 'Wenn du dieses Bild löschst, wird es unwiderruflich entfernt.',
      submitText: 'Bild löschen',
      danger: true,
    });

    if (!isConfirmed) return;

    deletingImage.value = true;
    try {
      await imageUpload.removeImg(targetImage, targetItem.id);
      await ctx.refreshItem(targetItem.id);
      useToast().success('Bild gelöscht.', 3000);
    } catch {
      useToast().error('Fehler beim Löschen des Bildes.', 4000);
    } finally {
      deletingImage.value = false;
    }
  }

  function makeThumb(url: string) {
    return imageUpload.makeThumb(url);
  }

  return {
    showImageViewer,
    viewerImages,
    viewerStartIndex,
    imageMenu,
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
    makeThumb,
  };
}
