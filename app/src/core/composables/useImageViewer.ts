import { useModalStore } from '@/stores/modalStore';
import type { ImageItem } from '@/modules/tasks/types';

/**
 * Thin composable wrapper around the modal store's image-viewer slice.
 * Call-sites should use this instead of importing the store directly.
 */
export function useImageViewer() {
  const store = useModalStore();

  return {
    isImageViewerOpen: store.imageViewerOpen as Readonly<
      typeof store.imageViewerOpen
    >,
    imageViewerImages: store.imageViewerImages as Readonly<
      typeof store.imageViewerImages
    >,
    imageViewerInitialIndex: store.imageViewerInitialIndex as Readonly<
      typeof store.imageViewerInitialIndex
    >,
    openImageViewer: (images: ImageItem[], initialIndex?: number) =>
      store.openImageViewer(images, initialIndex),
    closeImageViewer: store.closeImageViewer,
  };
}
