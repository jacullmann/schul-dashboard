import { computed, ref, watch, type Ref } from 'vue';

/** The highlighted one of `items`, moved by arrow keys; back at the top whenever they change. */
export function useActiveItem<T>(items: Readonly<Ref<readonly T[]>>) {
  const activeIndex = ref(0);

  watch(items, () => {
    activeIndex.value = 0;
  });

  const activeItem = computed<T | undefined>(
    () => items.value[activeIndex.value],
  );

  function moveActive(step: number) {
    const count = items.value.length;
    if (count) activeIndex.value = (activeIndex.value + step + count) % count;
  }

  function setActive(item: T) {
    const index = items.value.indexOf(item);
    if (index !== -1) activeIndex.value = index;
  }

  return { activeItem, moveActive, setActive };
}
