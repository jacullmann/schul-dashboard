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
  Send,
  Reply,
  X,
  Loader2,
  ArrowDown,
  Info,
  Users
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

  const timeDiff = new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
  return timeDiff < 90000; // Group if within 90 seconds
};

const isGroupedWithNext = (msg: any, index: number) => {
  if (index === messages.value.length - 1) return false;
  const nextMsg = messages.value[index + 1];
  if (nextMsg.userId !== msg.userId) return false;
  if (nextMsg.parentId) return false;
  if (msg.parentId) return false;

  const timeDiff = new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime();
  return timeDiff < 90000;
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
  showScrollBottomBtn.value = c.scrollHeight - c.scrollTop - c.clientHeight > 300;
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
  <div class="h-[calc(100vh-100px)] min-h-[500px] flex flex-col overflow-hidden relative border border-surface-border bg-surface shadow-input rounded-2xl p-0 animate-fade-up">
    
    <!-- Sophisticated Minimalist Header -->
    <div class="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface shrink-0">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-xl bg-action/10 border border-action/15 flex items-center justify-center text-action shadow-sm relative group">
          <MessageSquare class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface shadow-sm"></span>
        </div>
        <div>
          <h2 class="text-sm font-bold tracking-tight text-on-ghost flex items-center gap-2">
            {{ t('chat.title') }}
          </h2>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p class="text-xs font-semibold text-on-ghost-muted select-none">
              {{ t('chat.joinedRoom') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Message Area -->
    <div
      ref="messageContainer"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto px-6 py-4 space-y-1.5 custom-scrollbar scroll-smooth bg-canvas"
    >
      <!-- Loading State -->
      <div v-if="loading" class="h-full flex flex-col justify-center items-center gap-3 text-on-ghost-muted">
        <Loader2 class="w-7 h-7 animate-spin text-action" />
        <span class="text-xs font-semibold tracking-wider uppercase opacity-85 animate-pulse">Lade Chat...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="h-full flex flex-col justify-center items-center gap-3 text-danger p-6 text-center">
        <Info class="w-9 h-9 opacity-80" />
        <span class="text-sm font-semibold tracking-tight">{{ error }}</span>
        <button @click="fetchMessages" class="mt-2 px-5 py-2.5 text-xs font-bold bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger rounded-2xl transition-all duration-200 shadow-sm active:scale-95">
          Erneut laden
        </button>
      </div>

      <!-- Messages Stream -->
      <template v-else>
        <div v-if="messages.length === 0" class="h-full flex flex-col justify-center items-center text-on-ghost-muted gap-3 p-6 text-center select-none">
          <div class="w-16 h-16 bg-surface-hover/20 rounded-3xl border border-surface-border/30 flex items-center justify-center opacity-80 mb-1">
            <MessageSquare class="w-6 h-6 text-on-ghost-muted opacity-80 animate-pulse" />
          </div>
          <span class="text-sm font-bold tracking-tight text-on-ghost-muted">{{ t('chat.noMessages') }}</span>
        </div>

        <TransitionGroup name="msg-list">
          <div
            v-for="(msg, index) in messages"
            :key="msg.id"
            :id="`msg-${msg.id}`"
            :class="[
              'group/msg flex items-end gap-3 max-w-[85%] sm:max-w-[70%] transition-all duration-200',
              msg.userId === currentUserId ? 'ml-auto flex-row-reverse' : 'mr-auto',
              isGroupedWithPrevious(msg, index) ? 'mt-[3px]' : 'mt-4'
            ]"
          >
            <!-- User Avatar (Only for others, hidden for grouped consecutive messages) -->
            <div class="w-9 shrink-0 flex justify-center">
              <div
                v-if="msg.userId !== currentUserId && !isGroupedWithPrevious(msg, index)"
                class="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0 shadow-md select-none border border-white/10 relative transition-transform duration-300 hover:scale-105"
                :style="{ background: getAvatarGradient(msg.senderName) }"
                :title="msg.senderName"
              >
                {{ getAvatarInitials(msg.senderName) }}
              </div>
            </div>

            <!-- Message Body -->
            <div class="flex flex-col gap-0.5 relative max-w-full">
              <!-- Username display for others (Only if not grouped) -->
              <span
                v-if="msg.userId !== currentUserId && !isGroupedWithPrevious(msg, index)"
                class="text-[10px] font-bold text-on-ghost-muted px-1 tracking-tight select-none mb-1"
              >
                {{ msg.senderName }}
              </span>

              <!-- Message Card Bubble with custom grouped borders -->
              <div
                :class="[
                  'py-2.5 px-4 transition-all duration-200 relative group message-bubble',
                  msg.userId === currentUserId
                    ? 'bg-action text-on-action border border-action/10 shadow-sm'
                    : 'bg-surface-highlight border border-surface-border text-on-ghost hover:bg-surface-hover/80 hover:border-surface-hover-border shadow-sm',
                  
                  // Border radius computation for group chains
                  msg.userId === currentUserId
                    ? [
                        isGroupedWithPrevious(msg, index) && isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tr-md rounded-br-md' : '',
                        !isGroupedWithPrevious(msg, index) && isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tr-none rounded-br-md' : '',
                        isGroupedWithPrevious(msg, index) && !isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tr-md rounded-br-none' : '',
                        !isGroupedWithPrevious(msg, index) && !isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tr-none' : ''
                      ]
                    : [
                        isGroupedWithPrevious(msg, index) && isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tl-md rounded-bl-md' : '',
                        !isGroupedWithPrevious(msg, index) && isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tl-none rounded-bl-md' : '',
                        isGroupedWithPrevious(msg, index) && !isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tl-md rounded-bl-none' : '',
                        !isGroupedWithPrevious(msg, index) && !isGroupedWithNext(msg, index) ? 'rounded-2xl rounded-tl-none' : ''
                      ]
                ]"
              >
                <!-- Reply context -->
                <div
                  v-if="msg.parentId && msg.parentContent"
                  @click="scrollToMessage(msg.parentId)"
                  :class="[
                    'mb-2 p-2.5 border-l-2 text-[11px] rounded-xl transition-all duration-150 cursor-pointer select-none max-w-full truncate',
                    msg.userId === currentUserId
                      ? 'bg-on-action/10 hover:bg-on-action/15 border-on-action/40 text-on-action/90'
                      : 'bg-surface/50 border-surface-border text-on-ghost-muted hover:bg-surface/80'
                  ]"
                  :title="t('chat.quoteLabel')"
                >
                  <span class="block font-bold mb-0.5 opacity-90 text-[10px]">@{{ msg.parentSenderName }}</span>
                  <span class="italic font-medium">{{ msg.parentContent }}</span>
                </div>

                <!-- Message Text -->
                <p class="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium tracking-tight">
                  {{ msg.content }}
                </p>

                <!-- Timestamp inside bubble -->
                <span
                  :class="[
                    'block text-[9px] mt-1 select-none font-bold tracking-tight opacity-75',
                    msg.userId === currentUserId ? 'text-on-action/60 text-right' : 'text-on-ghost-muted/80 text-left'
                  ]"
                >
                  {{ formatTime(msg.createdAt) }}
                </span>

                <!-- Modern floating actions on hover -->
                <div
                  :class="[
                    'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 flex items-center transition-all duration-200 delay-75 scale-90 translate-y-1 group-hover/msg:scale-100 group-hover/msg:translate-y-[-50%] z-10',
                    msg.userId === currentUserId ? 'left-[-40px]' : 'right-[-40px]'
                  ]"
                >
                  <button
                    @click="startReply(msg)"
                    class="p-2 bg-surface hover:bg-surface-highlight border border-surface-border text-on-ghost-muted hover:text-action shadow-md rounded-xl transition-all duration-150 active:scale-95"
                    title="Antworten"
                  >
                    <Reply class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </template>
    </div>

    <!-- Minimalistic Floating Scroll Bottom Button -->
    <Transition name="scale-fade">
      <button
        v-if="showScrollBottomBtn"
        @click="scrollToBottom(true)"
        class="absolute bottom-24 right-8 p-3.5 bg-action hover:bg-action-hover text-on-action rounded-full shadow-lg border border-action/15 hover:scale-110 active:scale-95 transition-all duration-200 z-50 flex items-center justify-center"
        title="Nach unten"
      >
        <ArrowDown class="w-4 h-4" />
      </button>
    </Transition>

    <!-- Typing Indicator Area -->
    <div class="px-6 py-1 h-6 flex items-center shrink-0 bg-canvas">
      <Transition name="fade">
        <div v-if="typingDisplay" class="flex items-center gap-2.5 text-[10px] text-on-ghost-muted font-bold select-none tracking-tight">
          <div class="flex items-center gap-1.5 h-2">
            <span class="w-1.5 h-1.5 bg-action rounded-full typing-dot"></span>
            <span class="w-1.5 h-1.5 bg-action rounded-full typing-dot"></span>
            <span class="w-1.5 h-1.5 bg-action rounded-full typing-dot"></span>
          </div>
          <span class="animate-pulse">{{ typingDisplay }}</span>
        </div>
      </Transition>
    </div>

    <!-- Bottom Input Bar & Active Reply Area -->
    <div class="border-t border-surface-border bg-surface shrink-0">
      
      <!-- Premium active reply context banner -->
      <Transition name="slide-up">
        <div
          v-if="replyParent"
          class="flex items-center justify-between px-6 py-3 bg-surface-highlight border-b border-surface-border text-xs text-on-ghost-muted"
        >
          <div class="flex items-center gap-2.5 border-l-2 border-action pl-3 truncate max-w-[85%]">
            <Reply class="w-3.5 h-3.5 text-action shrink-0" />
            <span class="truncate font-bold tracking-tight select-none">
              {{ t('chat.replyingTo') }} <strong class="text-on-ghost">@{{ replyParent.senderName }}</strong>:
              <span class="italic text-on-ghost-muted font-normal ml-1 opacity-90">"{{ replyParent.content }}"</span>
            </span>
          </div>
          <button
            @click="replyParent = null"
            class="p-1.5 hover:text-on-ghost hover:bg-surface-hover/80 rounded-full transition-all duration-150 shrink-0"
            title="Antwort abbrechen"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </Transition>

      <!-- Float Input Area -->
      <form @submit.prevent="sendMessage" class="p-4 flex items-center gap-4">
        <div class="flex-1 relative flex items-center bg-surface-highlight border border-surface-border focus-within:border-action/40 focus-within:ring-2 focus-within:ring-action/5 rounded-2xl transition-all duration-200">
          <textarea
            id="chat-input-field"
            v-model="messageInput"
            @input="handleInput"
            @keydown.enter.prevent="sendMessage"
            rows="1"
            class="flex-1 py-4 pl-5 pr-12 bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-sm text-on-ghost placeholder:text-on-ghost-subtle resize-none max-h-24 custom-scrollbar font-medium tracking-tight"
            :placeholder="t('chat.placeholder')"
            required
            maxlength="1000"
          ></textarea>
        </div>

        <button
          type="submit"
          :disabled="!messageInput.trim()"
          :class="[
            'p-4 rounded-2xl transition-all duration-200 shrink-0 flex items-center justify-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
            messageInput.trim()
              ? 'bg-action text-on-action hover:bg-action-hover hover:scale-105 shadow-sm'
              : 'bg-surface-hover text-on-ghost-muted border border-surface-border'
          ]"
        >
          <Send class="w-4.5 h-4.5" />
        </button>
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
  0%, 100% {
    box-shadow: 0 0 0 0 transparent;
    border-color: var(--color-surface-border);
  }
  50% {
    box-shadow: 0 0 12px 2px var(--color-focus);
    border-color: var(--color-action);
    transform: scale(1.015);
  }
}

.flash-message {
  animation: flash-message-pulse 1.8s cubic-bezier(0.16, 1, 0.3, 1) 1;
  transition: all 0.3s ease;
}

/* Tactile bounce animation for typing indicator dots */
@keyframes wave-dots {
  0%, 100% {
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

/* Premium micro-elevations on bubble hover */
.message-bubble {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.message-bubble:hover {
  transform: translateY(-0.5px);
  box-shadow: 0 4px 14px -3px rgba(0, 0, 0, 0.08);
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
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, padding 0.2s ease;
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
  transform: scale(0.75) translate(4px, 4px);
}
</style>
