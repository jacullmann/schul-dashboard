import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import type { HwItem, ImageItem } from '@/modules/tasks/types';
import { useModalStore } from '@/stores/modalStore';
import { useToast } from '@/common/composables/useToast';
import type { HwContext } from './types';
import type { TaskPermissions } from '../useTaskPermissions';

export function useHwImages(
  ctx: HwContext,
  imageUpload: any,
  permissions: TaskPermissions,
) {
  const { t } = useI18n();

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

  function handleImageContextMenu(
    event: MouseEvent,
    item: HwItem,
    img: ImageItem,
  ) {
    openImageMenu(event, item, img);
  }

  function openImageMenu(event: MouseEvent, item: HwItem, img: ImageItem) {
    if (!ctx.user.value) return;
    const hasActions =
      permissions.canUploadImages.value ||
      permissions.canDeleteImage(item, img);
    if (!hasActions) return;
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
    if (!targetItem || !permissions.canUploadImages.value) return;

    imageUpload.init(targetItem.images);
    currentUploadItemId.value = targetItem.id;
    imageUpload.uploadImage(true, targetItem.id);
    closeImageMenu();
  }

  function triggerImageDrop(item: HwItem, files: File[]) {
    if (!item || !files.length || !permissions.canUploadImages.value) return;

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
      title: t('tasks.images.delete_modal.title'),
      content: t('tasks.images.delete_modal.message'),
      submitText: t('tasks.images.delete_modal.submit'),
      danger: true,
    });

    if (!isConfirmed) return;

    deletingImage.value = true;
    try {
      await imageUpload.removeImg(targetImage, targetItem.id);
      await ctx.refreshItem(targetItem.id);
      useToast().success(t('tasks.images.delete_modal.success'), 3000);
    } catch {
      useToast().error(t('tasks.images.delete_modal.error'), 4000);
    } finally {
      deletingImage.value = false;
    }
  }

  function makeThumb(input: string) {
    return imageUpload.makeThumb(input);
  }

  return {
    imageMenu,
    deletingImage,
    currentUploadItemId,
    handleImageContextMenu,
    openImageMenu,
    closeImageMenu,
    triggerImageUpload,
    triggerImageDrop,
    triggerImageDelete,
    makeThumb,
  };
}
