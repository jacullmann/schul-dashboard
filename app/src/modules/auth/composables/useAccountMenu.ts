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

    if (isMobile.value) return {};

    let left = btnLeft.value;
    const width = Math.min(300, popupW.value || 300);

    if (left + width > vw.value - 8) {
      left = Math.max(8, vw.value - width - 8);
    }

    const spaceBelow = vh.value - btnBottom.value;
    const estimatedH = popupH.value || 350;

    if (spaceBelow < estimatedH) {
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

  function cancel() {
    open.value = false;
  }

  function closeAnimated() {
    if (isMobile.value && refs.baseMenu.value) {
      refs.baseMenu.value.startClose();
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
        await nextTick();
        refs.firstMenuBtnRef.value?.focus();
      }
    }
  }

  useEventListener(document, 'pointerdown', (e: PointerEvent) => {
    if (!open.value) return;
    const target = e.target as Node;
    if (refs.root.value?.contains(target)) return;
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
