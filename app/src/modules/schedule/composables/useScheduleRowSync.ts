import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { useResizeObserver, useWindowSize } from '@vueuse/core';

export function useScheduleRowSync(sourceRef: Ref<HTMLElement | null>) {
  const { width: windowWidth } = useWindowSize();
  const syncedRowHeights = ref<string>('');

  const syncRowHeights = () => {
    if (windowWidth.value >= 501) {
      if (syncedRowHeights.value !== '') {
        syncedRowHeights.value = '';
      }
      return;
    }

    if (sourceRef.value) {
      const styles = window.getComputedStyle(sourceRef.value);
      if (styles.gridTemplateRows && styles.gridTemplateRows !== 'none') {
        syncedRowHeights.value = styles.gridTemplateRows;
      }
    }
  };

  useResizeObserver(sourceRef, syncRowHeights);

  let observer: MutationObserver | null = null;

  onMounted(() => {
    nextTick(() => {
      syncRowHeights();
      requestAnimationFrame(syncRowHeights);
      setTimeout(syncRowHeights, 50);
      setTimeout(syncRowHeights, 150);
    });

    if (sourceRef.value && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        nextTick(() => {
          syncRowHeights();
          requestAnimationFrame(syncRowHeights);
        });
      });
      observer.observe(sourceRef.value, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }
  });

  watch(windowWidth, () => {
    nextTick(syncRowHeights);
  });

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  return {
    syncedRowHeights,
    syncRowHeights,
  };
}
