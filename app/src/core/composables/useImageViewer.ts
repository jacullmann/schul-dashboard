import { useModalStore } from '@/stores/modalStore';
import type { StoredFile } from '@/api/files';

export function useImageViewer() {
  const store = useModalStore();

  return {
    isImageViewerOpen: store.imageViewerOpen as Readonly<
      typeof store.imageViewerOpen
    >,
    imageViewerImages: store.imageViewerImages as Readonly<
      typeof store.imageViewerImages
    >,
    imageViewerInitialIndex: store.imageViewerInitialIndex,
    openImageViewer: (
      images: StoredFile[],
      initialIndex?: number,
      origin?: ((index: number) => HTMLElement | null) | null,
      menu?: ((event: MouseEvent, index: number) => void) | null,
    ) => store.openImageViewer(images, initialIndex, origin, menu),
    closeImageViewer: store.closeImageViewer,
  };
}
