<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useI18n } from 'vue-i18n';
import hw from '@/api/hwApi';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare,
  SendHorizontal,
  Reply,
  X,
  ArrowDown,
  Info,
  Ellipsis,
  Copy,
  Trash2,
} from '@lucide/vue';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';

import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

const { t } = useI18n();
const route = useRoute();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { userGroups } = useAppAuth();
const toast = useToast();
const modalStore = useModalStore();

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

const { floatingStyles, isPositioned } = useFloating(virtualElement, menuRef, {
  strategy: 'fixed',
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  transform: false,
  middleware: [offset(4), flip(), shift({ padding: 8 })],
});

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
const loading = ref(true);
const error = ref<string | null>(null);
const messageInput = ref('');
const replyParent = ref<any | null>(null);
const isTyping = ref(false);
const typingUsers = ref<Map<string, string>>(new Map());

const showScrollBottomBtn = ref(false);
const messageContainer = ref<HTMLElement | null>(null);

let touchStartX = 0;
let touchStartY = 0;
const activeSwipeMessageId = ref<string | null>(null);
const swipeX = ref(0);
const isSwiping = ref(false);

const handleTouchStart = (e: TouchEvent, msgId: string) => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  activeSwipeMessageId.value = msgId;
  isSwiping.value = false;
  swipeX.value = 0;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!activeSwipeMessageId.value) return;
  const touch = e.touches[0];
  const diffX = touch.clientX - touchStartX;
  const diffY = touch.clientY - touchStartY;

  if (!isSwiping.value) {
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8) {
      activeSwipeMessageId.value = null;
      return;
    }
    if (Math.abs(diffX) > 8) {
      isSwiping.value = true;
    }
  }

  if (isSwiping.value) {
    if (diffX > 0) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const maxSwipe = 80;
      swipeX.value = Math.min(diffX * 0.5, maxSwipe);
    } else {
      swipeX.value = 0;
    }
  }
};

const handleTouchEnd = (msg: any) => {
  if (activeSwipeMessageId.value === msg.id && isSwiping.value) {
    if (swipeX.value >= 40) {
      startReply(msg);
      if (window.navigator && window.navigator.vibrate) {
        try {
          window.navigator.vibrate(15);
        } catch (err) {
          // ignore security errors
        }
      }
    }
  }
  activeSwipeMessageId.value = null;
  swipeX.value = 0;
  isSwiping.value = false;
};

let socket: Socket | null = null;
let typingTimeout: any = null;

const isGroupedWithPrevious = (msg: any, index: number) => {
  if (index === 0) return false;
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
};

const formatTime = (timestamp: string) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fetchMessages = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await hw.get('/api/messages');
    messages.value = data;
    scrollToBottom(true);
  } catch (err) {
    error.value = t('chat.errorLoading');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const initSocket = () => {
  const socketUrl = import.meta.env.VITE_HW_API_BASE || window.location.origin;
  socket = io(`${socketUrl}/messages`, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket.io client connected');
    if (socket && groupId.value) {
      socket.emit('joinGroup', { groupId: groupId.value });
    }
  });

  socket.on('newMessage', (message: any) => {
    if (messages.value.some((m) => m.id === message.id)) return;
    messages.value.push(message);
    scrollToBottom();
  });

  socket.on('messageDeleted', ({ messageId }: { messageId: string }) => {
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
  });

  socket.on('userTyping', ({ userId, senderName, isTyping: userIsTyping }) => {
    if (userId === currentUserId.value) return;
    if (userIsTyping) {
      typingUsers.value.set(userId, senderName);
    } else {
      typingUsers.value.delete(userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket.io client disconnected');
  });
};

const cleanupSocket = () => {
  if (socket) {
    socket.off('connect');
    socket.off('newMessage');
    socket.off('messageDeleted');
    socket.off('userTyping');
    socket.off('disconnect');
    socket.disconnect();
    socket = null;
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
  const currentReplyParent = replyParent.value;
  replyParent.value = null;
  emitStopTyping();

  try {
    await hw.post('/api/messages', payload);
  } catch (err) {
    console.error('Failed to send message:', err);
    messageInput.value = text;
    replyParent.value = currentReplyParent;
  }
};

const handleInput = () => {
  if (!socket || !socket.connected) return;

  if (!isTyping.value) {
    isTyping.value = true;
    socket.emit('typing', { groupId: groupId.value });
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    emitStopTyping();
  }, 2000);
};

const emitStopTyping = () => {
  if (!socket || !socket.connected || !isTyping.value) return;
  isTyping.value = false;
  socket.emit('stopTyping', { groupId: groupId.value });
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
    return `${users[0]} & ${users[1]} ${t('chat.typingMultiple')}`;
  }
  return `${users[0]} & ${users.length - 1} ${t('sidebar.others')} ${t('chat.typingMultiple')}`;
});

const canDeleteMessage = (msg: any) => {
  if (!user.value) return false;
  if (msg.userId === currentUserId.value) return true;
  if (user.value.role === 'superadmin') return true;
  const activeGroup = userGroups.value.find((g) => g.id === groupId.value);
  if (
    activeGroup &&
    (activeGroup.role === 'admin' || activeGroup.role === 'moderator')
  ) {
    return true;
  }
  return false;
};

const copyMessage = async (msg: any) => {
  activeMessage.value = null;
  try {
    await navigator.clipboard.writeText(msg.content);
    toast.success(t('chat.copySuccess'));
  } catch (err) {
    console.error('Failed to copy message:', err);
    toast.error(t('global.errors.unknown'));
  }
};

const deleteMessage = async (msg: any) => {
  activeMessage.value = null;
  const isConfirmed = await modalStore.confirm({
    title: t('chat.deleteConfirmTitle'),
    content: t('chat.deleteConfirm'),
    submitText: t('global.buttons.delete'),
    danger: true,
  });

  if (!isConfirmed) return;

  try {
    await hw.delete(`/api/messages/${msg.id}`);
    toast.success(t('chat.deleteSuccess'));
  } catch (err) {
    console.error('Failed to delete message:', err);
    toast.error(t('global.errors.delete'));
  }
};

onMounted(() => {
  void fetchMessages();
  initSocket();

  document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  emitStopTyping();
  cleanupSocket();
  document.body.style.overflow = '';
});

watch(groupId, () => {
  cleanupSocket();
  void fetchMessages();
  initSocket();
});
</script>

<template>
  <div
    class="chat-container md:min-h-[500px] min-h-0 flex flex-col overflow-hidden relative p-0 animate-fade-up"
  >
    <div
      ref="messageContainer"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto py-4 custom-scrollbar scroll-smooth bg-canvas"
    >
      <div
        v-if="loading"
        class="h-full flex flex-col justify-center items-center gap-3 text-on-ghost-muted"
      >
        <BaseSpinner size="32px" />
        <span
          class="text-xs font-semibold tracking-wider uppercase opacity-85 animate-pulse"
          >Lade Chat...</span
        >
      </div>

      <div
        v-else-if="error"
        class="h-full flex flex-col justify-center items-center gap-3 text-danger p-6 text-center"
      >
        <Info class="w-9 h-9 opacity-80" />
        <span class="text-sm font-semibold tracking-tight">{{ error }}</span>
        <button
          @click="fetchMessages"
          class="mt-2 px-5 py-2.5 text-xs font-bold bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger rounded-2xl transition-all duration-200 shadow-sm active:scale-95"
        >
          Erneut laden
        </button>
      </div>

      <template v-else>
        <div
          v-if="messages.length === 0"
          class="h-full flex flex-col justify-center items-center text-on-ghost-muted gap-3 p-6 text-center select-none"
        >
          <div
            class="w-16 h-16 bg-surface-hover/20 rounded-3xl border border-surface-border/30 flex items-center justify-center opacity-80 mb-1"
          >
            <MessageSquare
              class="w-6 h-6 text-on-ghost-muted opacity-80 animate-pulse"
            />
          </div>
          <span class="text-sm font-bold tracking-tight text-on-ghost-muted">{{
            t('chat.noMessages')
          }}</span>
        </div>

        <TransitionGroup name="msg-list">
          <div
            v-for="(msg, index) in messages"
            :key="msg.id"
            :id="`msg-${msg.id}`"
            class="group/msg w-full px-2 md:px-8"
            :class="isGroupedWithPrevious(msg, index) ? 'mt-1' : 'mt-4'"
            @contextmenu.prevent.stop="openMenu($event, msg)"
          >
            <div
              :class="[
                'flex items-end gap-2 max-w-[85%] sm:max-w-[70%] transition-all duration-200',
                msg.userId === currentUserId
                  ? 'ml-auto flex-row-reverse'
                  : 'mr-auto',
              ]"
            >
              <div
                v-if="msg.userId !== currentUserId"
                class="w-8 shrink-0 flex justify-center self-start"
              >
                <Avatar
                  v-if="
                    msg.userId !== currentUserId &&
                    !isGroupedWithPrevious(msg, index)
                  "
                  :name="msg.senderName"
                  :size="8"
                />
              </div>

              <div class="flex gap-0.5 relative max-w-full min-w-0">
                <div
                  v-if="activeSwipeMessageId === msg.id && swipeX > 0"
                  class="absolute left-[-32px] top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-0"
                  :style="{
                    opacity: Math.min(swipeX / 40, 1),
                    transform: `scale(${swipeX >= 40 ? 1.15 : 0.95}) translateY(-50%)`,
                  }"
                >
                  <div
                    class="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150"
                    :class="
                      swipeX >= 40
                        ? 'bg-action text-on-action shadow'
                        : 'bg-surface border border-surface-border text-on-ghost-subtle'
                    "
                  >
                    <Reply class="w-3.5 h-3.5" />
                  </div>
                </div>

                <div
                  :class="[
                    'p-2 transition-all duration-200 relative group min-w-0 max-w-full',
                    msg.userId === currentUserId
                      ? 'bg-action text-on-action shadow-input'
                      : 'bg-surface border border-surface-border text-on-ghost shadow-input',

                    getBubbleBorderClasses(msg, index),
                  ]"
                  :style="
                    activeSwipeMessageId === msg.id
                      ? {
                          transform: `translateX(${swipeX}px)`,
                          transition: 'none',
                        }
                      : {
                          transform: 'translateX(0px)',
                          transition:
                            'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }
                  "
                  @touchstart="handleTouchStart($event, msg.id)"
                  @touchmove="handleTouchMove"
                  @touchend="handleTouchEnd(msg)"
                >
                  <span
                    v-if="
                      msg.userId !== currentUserId &&
                      !isGroupedWithPrevious(msg, index)
                    "
                    class="px-2 text-base/relaxed font-bold text-on-ghost tracking-tight select-none mb-1"
                  >
                    {{ msg.senderName }}
                  </span>

                  <div
                    v-if="msg.parentId && msg.parentContent"
                    @click="scrollToMessage(msg.parentId)"
                    v-wave
                    :class="[
                      'flex flex-col mb-1 px-3 py-2 border-l-4 text-sm rounded-md transition-all duration-150 cursor-pointer select-none max-w-full w-full min-w-0',
                      msg.userId === currentUserId
                        ? 'bg-action-hover hover:bg-on-action/20 border-on-action-muted text-on-action-muted'
                        : 'bg-ghost-hover hover:bg-on-ghost/15 border-on-ghost-muted text-on-ghost-muted mt-1',
                    ]"
                    :title="t('chat.quoteLabel')"
                  >
                    <span class="font-bold">{{ msg.parentSenderName }}</span>
                    <span class="truncate">{{ msg.parentContent }}</span>
                  </div>

                  <div
                    class="px-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1"
                  >
                    <span
                      class="text-base/relaxed whitespace-pre-wrap break-words"
                    >
                      {{ msg.content }}
                    </span>
                    <span
                      :class="[
                        'text-xs select-none font-normal tracking-tight whitespace-nowrap ml-auto self-end',
                        msg.userId === currentUserId
                          ? 'text-on-action-muted/70'
                          : 'text-on-ghost-subtle',
                      ]"
                    >
                      {{ formatTime(msg.createdAt) }}
                    </span>
                  </div>

                  <div
                    :class="[
                      'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 flex gap-2 items-center transition-all duration-200 delay-75 scale-90 translate-y-1 group-hover/msg:scale-100 group-hover/msg:translate-y-[-50%] z-10 hidden md:flex',
                      msg.userId === currentUserId
                        ? 'left-[-96px] flex-row-reverse'
                        : 'right-[-96px] flex-row',
                    ]"
                  >
                    <BaseTooltip content="Antworten" placement="bottom">
                      <BaseButton @click="startReply(msg)" :icon="Reply" />
                    </BaseTooltip>

                    <BaseTooltip content="Mehr" placement="bottom">
                      <BaseButton
                        @click.stop="openMenu($event, msg)"
                        :icon="Ellipsis"
                      />
                    </BaseTooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>

        <Teleport to="body">
          <BaseMenu
            :open="!!activeMessage"
            @close="activeMessage = null"
            :ref="(el: any) => (menuRef = el?.menuEl)"
            class="fixed! z-[10001]! min-w-[180px]"
            :style="contextMenuStyles"
          >
            <BaseMenuButton
              v-if="activeMessage"
              :icon="Copy"
              @click="copyMessage(activeMessage)"
            >
              {{ t('global.buttons.copy') }}
            </BaseMenuButton>

            <BaseMenuButton
              v-if="activeMessage && canDeleteMessage(activeMessage)"
              variant="danger"
              :icon="Trash2"
              @click="deleteMessage(activeMessage)"
            >
              {{ t('global.buttons.delete') }}
            </BaseMenuButton>
          </BaseMenu>
        </Teleport>

        <div class="px-6 py-1 h-6 mt-4 flex items-center shrink-0 bg-canvas">
          <Transition name="fade">
            <div
              v-if="typingDisplay"
              class="flex items-center gap-2.5 text-sm text-on-ghost-muted font-bold select-none"
            >
              <div class="flex items-center gap-1 h-2">
                <span
                  class="w-1.5 h-1.5 bg-action rounded-full typing-dot"
                ></span>
                <span
                  class="w-1.5 h-1.5 bg-action rounded-full typing-dot"
                ></span>
                <span
                  class="w-1.5 h-1.5 bg-action rounded-full typing-dot"
                ></span>
              </div>
              <span>{{ typingDisplay }}</span>
            </div>
          </Transition>
        </div>
      </template>
    </div>

    <Transition name="scale-fade">
      <BaseButton
        v-if="showScrollBottomBtn"
        variant="action"
        @click="scrollToBottom(true)"
        class="absolute! bottom-20 right-4 md:bottom-24 md:right-8"
        title="Nach unten"
        :icon="ArrowDown"
      >
      </BaseButton>
    </Transition>

    <div class="shrink-0">
      <form
        novalidate
        @submit.prevent="sendMessage"
        class="p-2 pt-0 flex items-end gap-2"
      >
        <div
          class="flex-1 min-w-0 relative flex flex-col items-stretch py-2.25 px-2.25 min-h-10 bg-surface border border-surface-border focus-within:border-focus focus-within:shadow-focus-ring rounded-2xl transition-all duration-200"
          :class="replyParent ? 'rounded-t-xl' : ''"
        >
          <Transition name="slide-up">
            <div
              v-if="replyParent"
              class="flex w-full min-w-0 items-center justify-between px-3 py-2 mb-2 rounded-md bg-ghost-hover border-l-4 border-action text-xs text-on-ghost-muted"
            >
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <span class="text-sm font-bold select-none truncate">
                  {{ replyParent.senderName }}
                </span>
                <span class="text-sm font-normal text-on-ghost-subtle truncate">
                  {{ replyParent.content }}
                </span>
              </div>
              <BaseButton
                @click="replyParent = null"
                class="p-1.5 hover:text-on-ghost hover:bg-surface-hover/80 rounded-full transition-all duration-150 shrink-0"
                title="Antwort abbrechen"
                variant="ghost"
                on="ghost"
                :icon="X"
              />
            </div>
          </Transition>
          <textarea
            id="chat-input-field"
            v-model="messageInput"
            @input="handleInput"
            @keydown.enter.prevent="sendMessage"
            rows="1"
            class="w-full flex-1 items-center justify-center py-0 px-1.75 rounded-none bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-base/5 text-on-ghost placeholder:text-on-ghost-subtle resize-none font-normal"
            :placeholder="t('chat.placeholder')"
            required
            maxlength="1000"
          ></textarea>
        </div>

        <BaseButton
          variant="action"
          on="ghost"
          type="submit"
          :disabled="!messageInput.trim()"
          :icon="SendHorizontal"
        >
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  height: calc(
    100dvh - var(--header-height, 65px) - var(--announcement-height, 0px) - 8px
  );
  height: calc(
    100dvh - var(--header-height, 65px) - var(--announcement-height, 0px) -
      8px - env(safe-area-inset-bottom, 0px)
  );
}

@keyframes flash-message-pulse {
  0%,
  100% {
    background-color: transparent;
  }
  50% {
    background-color: var(--color-ghost-hover);
  }
}

.flash-message {
  animation: flash-message-pulse 1.8s cubic-bezier(0.16, 1, 0.3, 1) 1;
  transition: all 0.3s ease;
}

@keyframes wave-dots {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-3.5px);
    opacity: 1;
  }
}

.typing-dot {
  animation: wave-dots 1.1s ease-in-out infinite;
}
.typing-dot:nth-child(2) {
  animation-delay: 0.18s;
}
.typing-dot:nth-child(3) {
  animation-delay: 0.36s;
}

.msg-list-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.msg-list-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
.msg-list-move {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease,
    padding 0.2s ease;
  max-height: 52px;
  overflow: hidden;
}
.slide-up-enter-from,
.slide-up-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.75) translateY(8px);
}
</style>
