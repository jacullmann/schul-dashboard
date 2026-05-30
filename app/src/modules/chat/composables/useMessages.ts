import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import hw from '../../../api/api';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

export function useMessages() {
  const i18n = useI18n();
  const t = (key: string, named?: Record<string, any>) =>
    i18n.t(key, named || {});

  const route = useRoute();
  const userStore = useUserStore();
  const { user } = storeToRefs(userStore);
  const { checkPermission } = useAppAuth();
  const toast = useToast();
  const modalStore = useModalStore();

  const canSend = computed(() => {
    return checkPermission('send_messages');
  });

  const { width: windowWidth } = useWindowSize();
  const isMobile = computed(() => windowWidth.value < 768);

  const activeMessage = ref<any | null>(null);
  const menuPosition = ref({ x: 0, y: 0 });
  const menuRef = ref<HTMLElement | null>(null);

  const virtualElement = computed(() => {
    if (menuPosition.value.x === 0 && menuPosition.value.y === 0) {
      return null;
    }
    return {
      getBoundingClientRect() {
        return {
          width: 0,
          height: 0,
          x: menuPosition.value.x,
          y: menuPosition.value.y,
          top: menuPosition.value.y,
          left: menuPosition.value.x,
          right: menuPosition.value.x,
          bottom: menuPosition.value.y,
        };
      },
    };
  });

  const { floatingStyles, isPositioned } = useFloating(
    virtualElement,
    menuRef,
    {
      strategy: 'fixed',
      placement: 'bottom-start',
      whileElementsMounted: autoUpdate,
      transform: false,
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    },
  );

  const contextMenuStyles = computed(() => ({
    ...floatingStyles.value,
    opacity: isPositioned.value ? undefined : 0,
  }));

  const openMenu = (event: MouseEvent, msg: any) => {
    activeMessage.value = msg;
    menuPosition.value = { x: event.clientX, y: event.clientY };
  };

  const groupId = computed(() => route.params.groupId as string);
  const currentUserId = computed(() => user.value?.id || '');

  const messages = ref<any[]>([]);
  const lastVisitAt = ref<string | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const messageInput = ref('');
  const replyParent = ref<any | null>(null);
  const isTyping = ref(false);
  const typingUsers = ref<Map<string, string>>(new Map());
  const pendingMarkRead = ref(false);
  const dismissedNewMessagesDivider = ref(false);
  const isInitialScroll = ref(true);

  const firstNewMessageIndex = computed(() => {
    if (!lastVisitAt.value) return -1;
    const visitTime = new Date(lastVisitAt.value).getTime();
    return messages.value.findIndex(
      (msg) =>
        msg.userId !== currentUserId.value &&
        new Date(msg.createdAt).getTime() > visitTime,
    );
  });

  const showScrollBottomBtn = ref(false);
  const messageContainer = ref<HTMLElement | null>(null);

  let ws: WebSocket | null = null;
  let typingTimeout: any = null;
  let reconnectTimeout: any = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;

  const isGroupedWithPrevious = (msg: any, index: number) => {
    if (index === 0) return false;
    if (index === firstNewMessageIndex.value) return false;
    const prevMsg = messages.value[index - 1];
    if (prevMsg.userId !== msg.userId) return false;

    const timeDiff =
      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    return timeDiff < 90000;
  };

  const getBubbleBorderClasses = (msg: any, index: number) => {
    const p = isGroupedWithPrevious(msg, index);
    const r = msg.parentId && msg.parentContent;

    return `rounded-2xl ${
      msg.userId === currentUserId.value
        ? p
          ? r
            ? 'rounded-t-xl'
            : ''
          : r
            ? 'rounded-tl-xl rounded-tr-sm'
            : 'rounded-tr-sm'
        : p
          ? ' rounded-tl-2xl'
          : ' rounded-tl-sm'
    }`;
  };

  const isNearBottom = () => {
    if (!messageContainer.value) return false;
    const c = messageContainer.value;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 180;
  };

  const scrollToBottom = (force = false) => {
    nextTick(() => {
      if (!messageContainer.value) return;
      if (force || isNearBottom()) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
      }
    });
  };

  const handleScroll = () => {
    if (!messageContainer.value) return;
    const c = messageContainer.value;
    showScrollBottomBtn.value =
      c.scrollHeight - c.scrollTop - c.clientHeight > 300;

    if (
      !dismissedNewMessagesDivider.value &&
      !isInitialScroll.value &&
      messages.value.length > 0
    ) {
      dismissedNewMessagesDivider.value = true;
      if (dividerTimeout) {
        clearTimeout(dividerTimeout);
      }
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchMessages = async () => {
    loading.value = true;
    error.value = null;
    isInitialScroll.value = true;
    try {
      const { data } = await hw.get('/messages');
      messages.value = data.messages;
      lastVisitAt.value = data.lastVisitAt;
      scrollToBottom(true);
      setTimeout(() => {
        isInitialScroll.value = false;
      }, 500);
    } catch (err) {
      error.value = t('chat.error_loading');
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  const sendWsMessage = (payload: object) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const initSocket = () => {
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const wsUrl = apiUrl.replace(/^https?/, (p) =>
      p === 'https' ? 'wss' : 'ws',
    );

    ws = new WebSocket(`${wsUrl}/messages/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      if (groupId.value) {
        sendWsMessage({ type: 'joinGroup', groupId: groupId.value });
      }
    };

    ws.onmessage = (event) => {
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === 'newMessage') {
        const message = data.message;
        if (messages.value.some((m) => m.id === message.id)) return;
        messages.value.push(message);
        if (message.userId !== currentUserId.value) {
          pendingMarkRead.value = true;
          void triggerMarkRead();
        }
        scrollToBottom();
      } else if (data.type === 'messageDeleted') {
        const messageId = data.messageId;
        if (activeMessage.value?.id === messageId) {
          activeMessage.value = null;
        }
        messages.value = messages.value.filter((m) => m.id !== messageId);
        messages.value.forEach((m) => {
          if (m.parentId === messageId) {
            m.parentId = null;
            m.parentContent = undefined;
            m.parentSenderName = undefined;
          }
        });
      } else if (data.type === 'userTyping') {
        const { userId, senderName, isTyping: userIsTyping } = data;
        if (userId === currentUserId.value) return;
        if (userIsTyping) {
          typingUsers.value.set(userId, senderName);
        } else {
          typingUsers.value.delete(userId);
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      ws = null;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        reconnectAttempts++;
        reconnectTimeout = setTimeout(() => {
          initSocket();
        }, delay);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  };

  const cleanupSocket = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  };

  const sendMessage = async () => {
    const text = messageInput.value.trim();
    if (!text) return;

    const payload: { content: string; parentId?: string } = {
      content: text,
    };

    if (replyParent.value) {
      payload.parentId = replyParent.value.id;
    }

    messageInput.value = '';
    const textarea = document.getElementById(
      'chat-input-field',
    ) as HTMLTextAreaElement | null;
    if (textarea) textarea.style.height = 'auto';

    const currentReplyParent = replyParent.value;
    replyParent.value = null;
    emitStopTyping();

    dismissedNewMessagesDivider.value = true;
    if (dividerTimeout) {
      clearTimeout(dividerTimeout);
    }

    try {
      await hw.post('/messages', payload);
    } catch (err) {
      console.error('Failed to send message:', err);
      messageInput.value = text;
      replyParent.value = currentReplyParent;
    }
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;

    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (!isTyping.value) {
      isTyping.value = true;
      sendWsMessage({ type: 'typing', groupId: groupId.value });
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      emitStopTyping();
    }, 2000);
  };

  const emitStopTyping = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isTyping.value) return;
    isTyping.value = false;
    sendWsMessage({ type: 'stopTyping', groupId: groupId.value });
  };

  const startReply = (message: any) => {
    replyParent.value = message;
    nextTick(() => {
      const input = document.getElementById('chat-input-field');
      if (input) input.focus();
    });
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash-message');
      setTimeout(() => {
        el.classList.remove('flash-message');
      }, 2000);
    }
  };

  const typingDisplay = computed(() => {
    const users = Array.from(typingUsers.value.values());
    if (users.length === 0) return '';
    if (users.length === 1) {
      return `${users[0]} ${t('chat.typing')}`;
    }
    if (users.length === 2) {
      return `${users[0]} & ${users[1]} ${t('chat.typing_multiple')}`;
    }
    return `${users[0]} & ${users.length - 1} ${t('common.sidebar.others')} ${t('chat.typing_multiple')}`;
  });

  const canDeleteMessage = (msg: any) => {
    if (!user.value) return false;
    if (msg.userId === currentUserId.value) return true;
    if (user.value.role === 'superadmin') return true;

    return checkPermission('delete_other_content');
  };

  const copyMessage = async (msg: any) => {
    activeMessage.value = null;
    try {
      await navigator.clipboard.writeText(msg.content);
      toast.success(t('chat.copy_success'));
    } catch (err) {
      console.error('Failed to copy message:', err);
      toast.error(t('common.errors.unknown'));
    }
  };

  const deleteMessage = async (msg: any) => {
    activeMessage.value = null;
    const isConfirmed = await modalStore.confirm({
      title: t('chat.delete_confirm_title'),
      content: t('chat.delete_confirm'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });

    if (!isConfirmed) return;

    try {
      await hw.delete(`/messages/${msg.id}`);
      toast.success(t('chat.delete_success'));
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error(t('common.errors.delete'));
    }
  };

  let dividerTimeout: any = null;

  const triggerMarkRead = async () => {
    if (!pendingMarkRead.value) return;
    if (document.visibilityState !== 'visible' || !document.hasFocus()) return;

    pendingMarkRead.value = false;
    try {
      await hw.post('/messages/read');
      lastVisitAt.value = new Date().toISOString();
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
      pendingMarkRead.value = true;
    }
  };

  const handleWindowFocus = () => {
    if (pendingMarkRead.value) {
      void triggerMarkRead();
    }
  };

  onMounted(() => {
    void fetchMessages();
    initSocket();

    document.body.style.overflow = 'hidden';
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    if (dividerTimeout) {
      clearTimeout(dividerTimeout);
    }
    dividerTimeout = setTimeout(() => {
      dismissedNewMessagesDivider.value = true;
    }, 4000);
  });

  onUnmounted(() => {
    emitStopTyping();
    cleanupSocket();
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('visibilitychange', handleWindowFocus);
    if (dividerTimeout) {
      clearTimeout(dividerTimeout);
    }
    if (pendingMarkRead.value) {
      pendingMarkRead.value = false;
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${apiUrl}/messages/read`);
      } else {
        void hw.post('/messages/read').catch(() => {});
      }
    }
    document.body.style.overflow = '';
  });

  watch(groupId, () => {
    if (pendingMarkRead.value) {
      pendingMarkRead.value = false;
      void hw.post('/messages/read').catch(() => {});
    }
    dismissedNewMessagesDivider.value = false;
    isInitialScroll.value = true;
    if (dividerTimeout) {
      clearTimeout(dividerTimeout);
    }
    cleanupSocket();
    reconnectAttempts = 0;
    void fetchMessages();
    initSocket();
    dividerTimeout = setTimeout(() => {
      dismissedNewMessagesDivider.value = true;
    }, 4000);
  });

  return {
    t,
    canSend,
    isMobile,
    activeMessage,
    menuRef,
    contextMenuStyles,
    openMenu,
    currentUserId,
    messages,
    loading,
    error,
    messageInput,
    replyParent,
    dismissedNewMessagesDivider,
    firstNewMessageIndex,
    showScrollBottomBtn,
    messageContainer,
    isGroupedWithPrevious,
    getBubbleBorderClasses,
    scrollToBottom,
    handleScroll,
    formatTime,
    fetchMessages,
    sendMessage,
    handleInput,
    startReply,
    scrollToMessage,
    typingDisplay,
    canDeleteMessage,
    copyMessage,
    deleteMessage,
  };
}
