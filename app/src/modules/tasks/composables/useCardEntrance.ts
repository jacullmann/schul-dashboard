import { ref, watch, type Ref } from 'vue';
import {
  entranceDelay,
  hasSettledEntrance,
} from '@/modules/tasks/utils/entrance';

/**
 * Cards that just appeared, by their place in the batch they arrived with, so
 * each batch cascades in from its first card. A card leaves the map once
 * settled: moving a card in the list re-inserts its node, which restarts its
 * animations.
 *
 * While `held`, the list sits behind a skeleton and may still reorder as it
 * loads, so the order is only taken once the cards are actually shown.
 */
export function useCardEntrance(
  ids: Readonly<Ref<string[]>>,
  held: Readonly<Ref<boolean>>,
) {
  const enteringOrder = ref(new Map<string, number>());
  let shownIds = new Set<string>();

  watch(
    [ids, held],
    ([currentIds, isHeld]) => {
      if (isHeld) return;
      const entering = new Map(enteringOrder.value);
      let order = 0;
      for (const id of currentIds) {
        if (!shownIds.has(id)) entering.set(id, order++);
      }
      shownIds = new Set(currentIds);
      enteringOrder.value = entering;
    },
    { immediate: true },
  );

  function isEntering(id: string) {
    return enteringOrder.value.has(id);
  }

  function entranceStyle(id: string) {
    const order = enteringOrder.value.get(id);
    return order === undefined ? {} : { '--enter-delay': entranceDelay(order) };
  }

  function handleEntranceEnd(event: AnimationEvent, id: string) {
    if (!hasSettledEntrance(event)) return;
    const entering = new Map(enteringOrder.value);
    entering.delete(id);
    enteringOrder.value = entering;
  }

  /** For a list put away before its cards settled, so they return in place. */
  function settleAll() {
    enteringOrder.value = new Map();
  }

  return { isEntering, entranceStyle, handleEntranceEnd, settleAll };
}
