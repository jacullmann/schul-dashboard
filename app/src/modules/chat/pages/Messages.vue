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
  Loader2,
  ArrowDown,
  Info,
} from '@lucide/vue';

const { t } = useI18n();
const route = useRoute();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const groupId = computed(() => route.params.groupId as string);
const currentUserId = computed(() => user.value?.id || '');

// Chat State
const messages = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const messageInput = ref('');
const replyParent = ref<any | null>(null);
const isTyping = ref(false);
const typingUsers = ref<Map<string, string>>(new Map());

// UI scroll state
const showScrollBottomBtn = ref(false);
const messageContainer = ref<HTMLElement | null>(null);

let socket: Socket | null = null;
let typingTimeout: any = null;

// Deterministic username avatar details
const getAvatarInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.split(/(?=[A-Z])/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarGradient = (username: string) => {
  if (!username) return 'linear-gradient(135deg, #cbd5e1, #94a3b8)';
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 80%, 65%), hsl(${(hue + 40) % 360}, 85%, 50%))`;
};

// visual message grouping algorithms (premium slack/iMessage style)
const isGroupedWithPrevious = (msg: any, index: number) => {
  if (index === 0) return false;
  const prevMsg = messages.value[index - 1];
  if (prevMsg.userId !== msg.userId) return false;
  if (msg.parentId) return false; // Don't group if this is a reply to keep layout clean
  if (prevMsg.parentId) return false;

  const timeDiff =
    new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
  return timeDiff < 90000; // Group if within 90 seconds
};

const getBubbleBorderClasses = (msg: any, index: number) => {
  const p = isGroupedWithPrevious(msg, index);

  return `rounded-2xl ${
    msg.userId === currentUserId.value
      ? (msg.parentId && msg.parentContent ? 'rounded-tl-xl' : '') +
        (p ? ' rounded-tr-2xl' : ' rounded-tr-sm')
      : p
        ? ' rounded-tl-2xl'
        : ' rounded-tl-sm'
  }`;
};

// Check if scroll is near bottom
const isNearBottom = () => {
  if (!messageContainer.value) return false;
  const c = messageContainer.value;
  return c.scrollHeight - c.scrollTop - c.clientHeight < 180;
};

// Scroll to bottom
const scrollToBottom = (force = false) => {
  nextTick(() => {
    if (!messageContainer.value) return;
    if (force || isNearBottom()) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
};

// Handle container scroll event to toggle the "Scroll to Bottom" sticky button
const handleScroll = () => {
  if (!messageContainer.value) return;
  const c = messageContainer.value;
  showScrollBottomBtn.value =
    c.scrollHeight - c.scrollTop - c.clientHeight > 300;
};

// Format Timestamp
const formatTime = (timestamp: string) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Fetch chat history
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

// Initialize WebSocket connection
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
    socket.off('userTyping');
    socket.off('disconnect');
    socket.disconnect();
    socket = null;
  }
};

// Send message via REST API
const sendMessage = async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const payload: { content: string; parentId?: string } = {
    content: text,
  };

  if (replyParent.value) {
    payload.parentId = replyParent.value.id;
  }

  // Clear typing and input fields immediately for snappy UI
  messageInput.value = '';
  const currentReplyParent = replyParent.value;
  replyParent.value = null;
  emitStopTyping();

  try {
    await hw.post('/api/messages', payload);
  } catch (err) {
    console.error('Failed to send message:', err);
    // Restore input on failure
    messageInput.value = text;
    replyParent.value = currentReplyParent;
  }
};

// Typing status emission
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

// Reply configuration
const startReply = (message: any) => {
  replyParent.value = message;
  nextTick(() => {
    const input = document.getElementById('chat-input-field');
    if (input) input.focus();
  });
};

// Quote clicking scrolls target parent message into view with flash effect
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

// Computed typing display string
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

onMounted(() => {
  void fetchMessages();
  initSocket();
});

onUnmounted(() => {
  emitStopTyping();
  cleanupSocket();
});

watch(groupId, () => {
  cleanupSocket();
  void fetchMessages();
  initSocket();
});
</script>

<template>
  <div
    class="h-[calc(100vh-100px)] min-h-[500px] flex flex-col overflow-hidden relative p-0 animate-fade-up"
  >
    <!-- Main Message Area -->
    <div
      ref="messageContainer"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto px-8 py-4 space-y-1.5 custom-scrollbar scroll-smooth bg-canvas"
    >
      <!-- Loading State -->
      <div
        v-if="loading"
        class="h-full flex flex-col justify-center items-center gap-3 text-on-ghost-muted"
      >
        <Loader2 class="w-7 h-7 animate-spin text-action" />
        <span
          class="text-xs font-semibold tracking-wider uppercase opacity-85 animate-pulse"
          >Lade Chat...</span
        >
      </div>

      <!-- Error State -->
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

      <!-- Messages Stream -->
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
            class="w-full"
          >
            <div
              :class="[
                'group/msg flex items-end gap-3 max-w-[85%] sm:max-w-[70%] transition-all duration-200',
                msg.userId === currentUserId
                  ? 'ml-auto flex-row-reverse'
                  : 'mr-auto',
                isGroupedWithPrevious(msg, index) ? 'mt-[3px]' : 'mt-4',
              ]"
            >
              <!-- User Avatar (Only for others, hidden for grouped consecutive messages) -->
              <div class="w-9 shrink-0 flex justify-center self-start">
                <div
                  v-if="
                    msg.userId !== currentUserId &&
                    !isGroupedWithPrevious(msg, index)
                  "
                  class="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0 shadow-md select-none border border-white/10 relative transition-transform duration-300 hover:scale-105"
                  :style="{ background: getAvatarGradient(msg.senderName) }"
                  :title="msg.senderName"
                >
                  {{ getAvatarInitials(msg.senderName) }}
                </div>
              </div>

              <!-- Message Body -->
              <div class="flex gap-0.5 relative max-w-full">
                <!-- Username display for others (Only if not grouped) -->

                <!-- Message Card Bubble with custom grouped borders -->
                <div
                  :class="[
                    'p-2 transition-all duration-200 relative group',
                    msg.userId === currentUserId
                      ? 'bg-action text-on-action shadow-input'
                      : 'bg-surface border border-surface-border text-on-ghost shadow-input',

                    getBubbleBorderClasses(msg, index),
                  ]"
                >
                  <span
                    v-if="
                      msg.userId !== currentUserId &&
                      !isGroupedWithPrevious(msg, index)
                    "
                    class="px-2 text-sm/relaxed font-bold text-on-ghost tracking-tight select-none mb-1"
                  >
                    {{ msg.senderName }}
                  </span>

                  <!-- Reply context -->
                  <div
                    v-if="msg.parentId && msg.parentContent"
                    @click="scrollToMessage(msg.parentId)"
                    :class="[
                      'mb-2 p-2.5 border-l-2 text-[11px] rounded-md transition-all duration-150 cursor-pointer select-none max-w-full truncate',
                      msg.userId === currentUserId
                        ? 'bg-on-action/10 hover:bg-on-action/15 border-on-action/40 text-on-action/90'
                        : 'bg-ghost-hover border-on-ghost-muted text-on-ghost-muted hover:bg-surface/80',
                    ]"
                    :title="t('chat.quoteLabel')"
                  >
                    <span class="block font-bold mb-0.5 opacity-90 text-[10px]"
                      >@{{ msg.parentSenderName }}</span
                    >
                    <span class="italic font-medium">{{
                      msg.parentContent
                    }}</span>
                  </div>

                  <!-- Message Text with Inline Timestamp -->
                  <div
                    class="px-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1"
                  >
                    <span
                      class="text-sm/relaxed whitespace-pre-wrap break-words"
                    >
                      {{ msg.content }}
                    </span>
                    <span
                      :class="[
                        'text-[10px] select-none font-bold tracking-tight opacity-75 whitespace-nowrap ml-auto self-end pb-[2px]',
                        msg.userId === currentUserId
                          ? 'text-on-action/60'
                          : 'text-on-ghost-muted/80',
                      ]"
                    >
                      {{ formatTime(msg.createdAt) }}
                    </span>
                  </div>

                  <!-- Modern floating actions on hover -->
                  <div
                    :class="[
                      'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 flex items-center transition-all duration-200 delay-75 scale-90 translate-y-1 group-hover/msg:scale-100 group-hover/msg:translate-y-[-50%] z-10',
                      msg.userId === currentUserId
                        ? 'left-[-56px]'
                        : 'right-[-56px]',
                    ]"
                  >
                    <BaseButton
                      @click="startReply(msg)"
                      title="Antworten"
                      :icon="Reply"
                    >
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>

        <!-- Typing Indicator Area -->
        <div class="px-6 py-1 h-6 flex items-center shrink-0 bg-canvas">
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

    <!-- Minimalistic Floating Scroll Bottom Button -->
    <Transition name="scale-fade">
      <BaseButton
        v-if="showScrollBottomBtn"
        variant="action"
        @click="scrollToBottom(true)"
        class="absolute! bottom-24 right-8"
        title="Nach unten"
        :icon="ArrowDown"
      >
      </BaseButton>
    </Transition>

    <!-- Bottom Input Bar & Active Reply Area -->
    <div class="shrink-0">
      <!-- Float Input Area -->
      <form
        novalidate
        @submit.prevent="sendMessage"
        class="px-2 pb-4 flex items-center gap-2"
      >
        <div
          class="flex-1 relative flex flex-col items-center py-2.25 px-2.25 min-h-10 bg-surface border border-surface-border focus-within:border-focus focus-within:shadow-focus-ring rounded-2xl transition-all duration-200"
          :class="replyParent ? 'rounded-t-xl' : ''"
        >
          <!-- Premium active reply context banner -->
          <Transition name="slide-up">
            <div
              v-if="replyParent"
              class="flex w-full items-center justify-between px-3 py-2 mb-2 rounded-md bg-ghost-hover border-l-4 border-action text-xs text-on-ghost-muted"
            >
              <div
                class="flex flex-col items-left justify-center truncate max-w-[85%]"
              >
                <span class="text-sm font-bold select-none">
                  {{ replyParent.senderName }}
                </span>
                <span class="text-sm font-normal text-on-ghost-muted">{{
                  replyParent.content
                }}</span>
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
            class="flex-1 items-center justify-center py-0 px-1.75 rounded-none bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-base/5 text-on-ghost placeholder:text-on-ghost-subtle resize-none max-h-24 custom-scrollbar font-medium tracking-tight"
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
/* Sophisticated minimal scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.15);
  border-radius: 99px;
  transition: all 0.2s ease;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
}

/* Pulse highlight animation for quoted scroll targets using variables */
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

/* Tactile bounce animation for typing indicator dots */
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

/* Smooth enter transitions for chat stream */
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

/* Standard Transitions */
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
