import {
  ref,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  type Ref,
} from 'vue';

const AVATAR_COLORS = [
  '#AA47BD',
  '#7B1FA2',
  '#77919D',
  '#455A65',
  '#EC417A',
  '#C1175C',
  '#0388D2',
  '#0098A7',
  '#004D40',
  '#EF6C00',
  '#F6511E',
];

function getColorIndexFromEmail(email: string): number {
  if (!email || email.length === 0) return 0;
  const charToHash = email.length >= 2 ? email[1] : email[0];
  if (!charToHash) return 0;
  const charCode = charToHash.charCodeAt(0);
  return charCode % AVATAR_COLORS.length;
}

import type { SetupContext } from 'vue';

export function useAccountMenu(
  props: { email: string; userData: Record<string, unknown> | null },
  emit: SetupContext['emit'],
  refs: {
    root: Ref<HTMLElement | null>;
    popupInner: Ref<HTMLElement | null>;
    firstMenuBtnRef: Ref<HTMLButtonElement | null>;
  },
) {
  const avatarLetter = computed(() => {
    return props.email && props.email.length > 0 && props.email[0]
      ? props.email[0].toUpperCase()
      : '?';
  });

  const avatarColor = computed(() => {
    const index = getColorIndexFromEmail(props.email);
    return AVATAR_COLORS[index];
  });

  const personalizationSetting = computed({
    get: () => props.userData?.personalized ?? true,
    set: () => {},
  });

  function onPersonalizationChange(value: boolean) {
    emit('personalizationChanged', value);
  }

  const open = ref(false);
  const errorMsg = ref('');
  const successMsg = ref('');
  const showChangePassword = ref(false);
  const showDeleteAccount = ref(false);
  const showSecurity = ref(false);
  const popupStyle = ref<Record<string, string>>({});

  function clearMessages() {
    errorMsg.value = '';
    successMsg.value = '';
  }

  function close() {
    open.value = false;
    clearMessages();
  }

  function handleLogout() {
    emit('logout');
    close();
  }
  function openSetup() {
    emit('openSetup');
    close();
  }
  function openChangePassword() {
    showChangePassword.value = true;
    close();
  }
  function openSecurity() {
    showSecurity.value = true;
    close();
  }
  function startDelete() {
    showDeleteAccount.value = true;
    close();
  }

  function onMfaChanged(enabled: boolean) {
    emit('mfaChanged', enabled);
  }
  function onAccountDeleted() {
    emit('deleted');
  }
  function onDeleteError(msg: string) {
    emit('error', msg);
  }

  function onPasswordChanged() {
    successMsg.value = 'Passwort erfolgreich geändert!';
    setTimeout(() => {
      successMsg.value = '';
    }, 3000);
  }

  async function positionPopup() {
    await nextTick();
    const rootEl = refs.root.value;
    const popupEl = refs.popupInner.value;
    if (!rootEl || !popupEl) return;

    const iconBtn = rootEl.querySelector('.icon-btn');
    if (!iconBtn) return;

    const btnRect = iconBtn.getBoundingClientRect();
    const popupRect = popupEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw <= 480) {
      popupStyle.value = {
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `${Math.max(64, btnRect.top + btnRect.height + 8)}px`,
        width: 'min(92vw, 300px)',
      };
      return;
    }

    let left = btnRect.left;
    let top = btnRect.top + btnRect.height + 8;

    if (left + popupRect.width > vw - 8) {
      left = Math.max(8, vw - popupRect.width - 8);
    }

    if (top + popupRect.height > vh - 8) {
      top = Math.max(8, btnRect.top - popupRect.height - 8);
    }

    popupStyle.value = {
      position: 'fixed',
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.min(300, popupRect.width || 300)}px`,
    };
  }

  async function toggle() {
    open.value = !open.value;
    if (open.value) {
      await positionPopup();
      await nextTick();
      refs.firstMenuBtnRef.value?.focus();
    }
    clearMessages();
  }

  function onDocClick(e: MouseEvent) {
    if (!refs.root.value) return;
    if (!refs.root.value.contains(e.target as Node)) {
      close();
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  function onResize() {
    if (open.value) positionPopup();
  }

  onMounted(() => {
    window.addEventListener('resize', onResize);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  });

  return {
    avatarLetter,
    avatarColor,
    personalizationSetting,
    onPersonalizationChange,
    open,
    errorMsg,
    successMsg,
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
    close,
  };
}
