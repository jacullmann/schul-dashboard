import { ref, computed, nextTick, type Ref, type CSSProperties } from 'vue';
import {
  useEventListener,
  useElementBounding,
  useWindowSize,
} from '@vueuse/core';
import type { UserData } from '@/stores/userStore';
import { useAccountModals } from '@/modules/auth/composables/useAccountModals';

export function useAccountMenu(
  props: { email: string; userData: UserData | null },
  emit: (event: any, ...args: any[]) => void,
  refs: {
    root: Ref<HTMLElement | null>;
    popupInner: Ref<HTMLElement | null>;
    firstMenuBtnRef: Ref<{ focus: () => void } | null>;
    // Ref to the BaseMenu component instance — used to call startClose()
    // for an animated dismiss on mobile instead of instant v-if unmount
    baseMenu: Ref<{ startClose: () => void } | null>;
  },
) {
  const accountModals = useAccountModals();

  const personalizationSetting = computed({
    get: () => props.userData?.personalized ?? true,
    set: () => {},
  });

  function onPersonalizationChange(value: boolean) {
    emit('personalizationChanged', value);
  }

  const open = ref(false);

  const {
    left: btnLeft,
    top: btnTop,
    bottom: btnBottom,
  } = useElementBounding(refs.root);
  const { width: popupW, height: popupH } = useElementBounding(refs.popupInner);
  const { width: vw, height: vh } = useWindowSize();

  const isMobile = computed(() => vw.value < 768);

  const popupStyle = computed<CSSProperties>(() => {
    if (!open.value) return {};

    // Mobile: BaseMenu handles its own bottom-sheet positioning
    if (isMobile.value) return {};

    let left = btnLeft.value;
    const width = Math.min(300, popupW.value || 300);

    if (left + width > vw.value - 8) {
      left = Math.max(8, vw.value - width - 8);
    }

    const spaceBelow = vh.value - btnBottom.value;
    const estimatedH = popupH.value || 350; // Account menu is tall

    if (spaceBelow < estimatedH) {
      // Not enough space below, place above the button.
      // We use `bottom` instead of `top` so the browser naturally grows it upwards without JS snapbacks.
      return {
        position: 'fixed',
        left: `${Math.round(left)}px`,
        bottom: `${Math.round(vh.value - btnTop.value + 8)}px`,
        width: `${width}px`,
        transformOrigin: 'bottom left',
      };
    } else {
      return {
        position: 'fixed',
        left: `${Math.round(left)}px`,
        top: `${Math.round(btnBottom.value + 8)}px`,
        width: `${width}px`,
        transformOrigin: 'top left',
      };
    }
  });

  // Instant close — used on desktop and for internal state teardown
  function cancel() {
    open.value = false;
  }

  // Animated close — plays the slide-down animation then calls cancel().
  // On desktop there is no animation so falls back to cancel() directly.
  function closeAnimated() {
    if (isMobile.value && refs.baseMenu.value) {
      refs.baseMenu.value.startClose();
      // cancel() will be called via the @close event emitted by BaseMenu
      // after the animation completes — do NOT call it here too.
    } else {
      cancel();
    }
  }

  function handleLogout() {
    emit('logout');
    closeAnimated();
  }

  function openSetup() {
    accountModals.openSetup();
    closeAnimated();
  }

  function openChangePassword() {
    accountModals.openChangePassword();
    closeAnimated();
  }

  function openSecurity() {
    accountModals.openSecurity();
    closeAnimated();
  }

  function startDelete() {
    accountModals.openDeleteAccount();
    closeAnimated();
  }

  async function toggle(e?: Event) {
    if (open.value) {
      // Closing — animate on mobile
      closeAnimated();
    } else {
      open.value = true;
      if (
        e &&
        (e.type === 'keydown' ||
          (e as KeyboardEvent).key === 'Enter' ||
          (e as KeyboardEvent).key === ' ')
      ) {
        await nextTick();
        refs.firstMenuBtnRef.value?.focus();
      } else if (
        e?.type === 'click' &&
        (e as PointerEvent).pointerType === ''
      ) {
        // Fallback for some weird focus behavior with Enter translating to a click event
        await nextTick();
        refs.firstMenuBtnRef.value?.focus();
      }
    }
  }

  // Click-outside on desktop only. On mobile the backdrop's click handler
  // calls startClose() inside BaseMenu — we must not also call cancel() here.
  // Guard by: (1) isMobile, and (2) target is inside the teleported sheet DOM,
  // which lives at <body> and is never inside refs.root.
  useEventListener(document, 'pointerdown', (e: PointerEvent) => {
    if (!open.value) return;
    const target = e.target as Node;
    // Always ignore clicks inside the trigger root
    if (refs.root.value?.contains(target)) return;
    // On mobile, the teleported backdrop/sheet is also "outside" refs.root —
    // ignore those too so the backdrop's own click handler can run startClose().
    if (isMobile.value) return;
    cancel();
  });

  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeAnimated();
  });

  return {
    isMobile,
    personalizationSetting,
    onPersonalizationChange,
    open,
    popupStyle,
    handleLogout,
    openSetup,
    openChangePassword,
    openSecurity,
    startDelete,
    toggle,
    cancel,
  };
}
