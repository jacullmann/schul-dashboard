import {
  ref,
  computed,
  type Ref,
} from 'vue';
import { onClickOutside, useEventListener, useElementBounding, useWindowSize } from '@vueuse/core';
import type { UserData } from '@/stores/userStore';
import { useToast } from '@/common/composables/useToast';

export function useAccountMenu(
  props: { email: string; userData: UserData | null },
  emit: (event: any, ...args: any[]) => void,
  refs: {
    root: Ref<HTMLElement | null>;
    popupInner: Ref<HTMLElement | null>;
    firstMenuBtnRef: Ref<HTMLButtonElement | null>;
  },
) {
  const personalizationSetting = computed({
    get: () => props.userData?.personalized ?? true,
    set: () => {},
  });

  function onPersonalizationChange(value: boolean) {
    emit('personalizationChanged', value);
  }

  const open = ref(false);
  const toast = useToast();
  const showChangePassword = ref(false);
  const showDeleteAccount = ref(false);
  const showSecurity = ref(false);

  // Reactive bounds — auto-update via ResizeObserver; return 0 when element is null/unmounted
  const { left: btnLeft, top: btnTop, right: btnRight, bottom: btnBottom, height: btnHeight } = useElementBounding(refs.root);
  const { width: popupW, height: popupH } = useElementBounding(refs.popupInner);
  const { width: vw, height: vh } = useWindowSize();

  const popupStyle = computed<Record<string, string>>(() => {
    if (!open.value) return {};

    if (vw.value <= 480) {
      return {
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `${Math.max(64, btnBottom.value + 8)}px`,
        width: 'min(92vw, 300px)',
      };
    }

    let left = btnLeft.value;
    let top = btnBottom.value + 8;

    if (left + popupW.value > vw.value - 8) {
      left = Math.max(8, vw.value - popupW.value - 8);
    }
    if (top + popupH.value > vh.value - 8) {
      top = Math.max(8, btnTop.value - popupH.value - 8);
    }

    return {
      position: 'fixed',
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.min(300, popupW.value || 300)}px`,
    };
  });

  function cancel() {
    open.value = false;
  }

  function handleLogout() {
    emit('logout');
    cancel();
  }
  function openSetup() {
    emit('openSetup');
    cancel();
  }
  function openChangePassword() {
    showChangePassword.value = true;
    cancel();
  }
  function openSecurity() {
    showSecurity.value = true;
    cancel();
  }
  function startDelete() {
    showDeleteAccount.value = true;
    cancel();
  }

  function onMfaChanged(enabled: boolean) {
    emit('mfaChanged', enabled);
  }
  function onAccountDeleted() {
    emit('deleted');
  }
  function onDeleteError(msg: string) {
    toast.error(msg);
    emit('error', msg);
  }

  function onPasswordChanged() {
    toast.success('Passwort erfolgreich geändert!');
  }

  async function toggle() {
    open.value = !open.value;
    if (open.value) {
      // Wait one tick for the popup to mount so firstMenuBtnRef is available
      await Promise.resolve();
      refs.firstMenuBtnRef.value?.focus();
    }
  }

  onClickOutside(refs.root, cancel);

  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') cancel();
  });

  return {
    personalizationSetting,
    onPersonalizationChange,
    open,
    showChangePassword,
    showDeleteAccount,
    showSecurity,
    popupStyle,
    handleLogout,
    openSetup,
    openChangePassword,
    openSecurity,
    startDelete,
    onMfaChanged,
    onPasswordChanged,
    onAccountDeleted,
    onDeleteError,
    toggle,
    cancel,
  };
}
