import {
  computed,
  ref,
  type ComputedRef,
  type CSSProperties,
  type Ref,
} from 'vue';
import { onClickOutside, useEventListener } from '@vueuse/core';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
} from '@floating-ui/vue';

interface FloatingMenuOptions {
  placement?: Placement;
  /** Distance in px between the trigger and the menu. */
  offset?: number;
}

interface FloatingMenu {
  isOpen: Ref<boolean>;
  /** Attach to the element the menu is anchored to. */
  triggerRef: Ref<HTMLElement | null>;
  /** Attach to the `BaseMenu` component instance. */
  menuComponentRef: Ref<{ menuEl?: HTMLElement | null } | null>;
  menuStyles: ComputedRef<CSSProperties>;
  toggle: () => void;
  close: () => void;
}

/**
 * Anchored menu wiring shared by the toolbar dropdowns: floating-ui positioning
 * plus the outside-click and Escape handlers that dismiss it.
 */
export function useFloatingMenu(
  options: FloatingMenuOptions = {},
): FloatingMenu {
  const { placement = 'bottom-start', offset: gap = 8 } = options;

  const isOpen = ref(false);
  const triggerRef = ref<HTMLElement | null>(null);
  const menuComponentRef = ref<{ menuEl?: HTMLElement | null } | null>(null);
  const menuRef = computed(() => menuComponentRef.value?.menuEl ?? null);

  const { floatingStyles, isPositioned } = useFloating(triggerRef, menuRef, {
    strategy: 'fixed',
    placement,
    whileElementsMounted: autoUpdate,
    transform: false,
    middleware: [offset(gap), flip(), shift({ padding: 8 })],
  });

  const menuStyles = computed<CSSProperties>(() => ({
    ...floatingStyles.value,
    opacity: isPositioned.value ? undefined : 0,
  }));

  const close = () => {
    isOpen.value = false;
  };

  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  onClickOutside(triggerRef, close, { ignore: [menuRef] });

  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  });

  return { isOpen, triggerRef, menuComponentRef, menuStyles, toggle, close };
}
