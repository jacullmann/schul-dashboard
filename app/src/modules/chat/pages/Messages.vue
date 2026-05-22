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
  Sparkles,
  Info
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

// Generate deterministic initials and beautiful color gradient for usernames
const getAvatarInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.split(/(?=[A-Z])/); // Split on uppercase letters
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
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 80%, 65%), hsl(${hue2}, 85%, 55%))`;
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

// Initialize WebSocket Socket.io connection
const initSocket = () => {
  const socketUrl = import.meta.env.VITE_HW_API_BASE || window.location.origin;
  socket = io(`${socketUrl}/messages`, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket.io client connected to /messages');
    if (socket && groupId.value) {
      socket.emit('joinGroup', { groupId: groupId.value });
    }
  });

  socket.on('newMessage', (message: any) => {
    // Avoid double adding if somehow received twice
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

// Clean up WebSocket connection
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

  // Clear typing indicator and input fields immediately for snappy UI
  messageInput.value = '';
  const currentReplyParent = replyParent.value;
  replyParent.value = null;
  emitStopTyping();

  try {
    await hw.post('/api/messages', payload);
    // Successful REST call triggers MessagesGateway to broadcast.
    // The broadcased message is caught by the 'newMessage' socket listener and added.
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

// React to group ID changes (e.g. from routing menu)
watch(groupId, () => {
  cleanupSocket();
  void fetchMessages();
  initSocket();
});
</script>

<template>
  <div class="card h-[calc(100vh-100px)] min-h-[500px] flex flex-col overflow-hidden relative border border-surface-border/40 bg-surface/50 backdrop-blur-md shadow-2xl p-0 animate-fade-up">
    <!-- Chat Header -->
    <div class="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-hover/20 backdrop-blur-sm shrink-0">
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl bg-action-color/10 border border-action-color/20 flex items-center justify-center text-action-color shadow-sm">
          <MessageSquare class="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 class="text-base font-bold text-foreground flex items-center gap-2">
            {{ t('chat.title') }}
            <span class="flex h-2.5 w-2.5 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h2>
          <p class="text-xs text-muted flex items-center gap-1">
            <Sparkles class="w-3.5 h-3.5 text-action-color/80" />
            {{ t('chat.joinedRoom') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Message Area -->
    <div
      ref="messageContainer"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto px-6 py-5 space-y-4 scroll-smooth"
    >
      <!-- Loading State -->
      <div v-if="loading" class="h-full flex flex-col justify-center items-center gap-3 text-muted">
        <Loader2 class="w-8 h-8 animate-spin text-action-color" />
        <span class="text-sm font-medium animate-pulse">Lade Gruppen-Chat...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="h-full flex flex-col justify-center items-center gap-2 text-danger p-6 text-center">
        <Info class="w-10 h-10 mb-2 opacity-80" />
        <span class="text-sm font-semibold">{{ error }}</span>
        <button @click="fetchMessages" class="mt-2 px-4 py-2 text-xs bg-danger/10 hover:bg-danger/20 border border-danger/20 rounded-lg transition-all duration-200">
          Erneut versuchen
        </button>
      </div>

      <!-- Messages Stream -->
      <template v-else>
        <div v-if="messages.length === 0" class="h-full flex flex-col justify-center items-center text-muted gap-2.5 p-6 text-center select-none">
          <div class="w-14 h-14 bg-surface-hover/30 rounded-2xl border border-surface-border/50 flex items-center justify-center opacity-70 mb-2">
            <MessageSquare class="w-7 h-7 text-muted/60" />
          </div>
          <span class="text-sm font-semibold">{{ t('chat.noMessages') }}</span>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          :id="`msg-${msg.id}`"
          :class="[
            'group/msg flex items-end gap-3.5 max-w-[85%] sm:max-w-[75%]',
            msg.userId === currentUserId ? 'ml-auto flex-row-reverse' : 'mr-auto'
          ]"
        >
          <!-- User Avatar (Only for others) -->
          <div
            v-if="msg.userId !== currentUserId"
            class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-md select-none border border-white/10"
            :style="{ background: getAvatarGradient(msg.senderName) }"
            :title="msg.senderName"
          >
            {{ getAvatarInitials(msg.senderName) }}
          </div>

          <!-- Message Body -->
          <div class="flex flex-col gap-1 relative max-w-full">
            <!-- Username display for others -->
            <span
              v-if="msg.userId !== currentUserId"
              class="text-[11px] font-bold text-muted/90 px-1 select-none"
            >
              {{ msg.senderName }}
            </span>

            <!-- Message Card Bubble -->
            <div
              :class="[
                'p-3.5 transition-all duration-200 shadow-md relative group',
                msg.userId === currentUserId
                  ? 'bg-gradient-to-br from-action-color to-action-hover text-white rounded-2xl rounded-tr-none border border-action-color/10'
                  : 'bg-card-bg border border-card-border/30 text-foreground rounded-2xl rounded-tl-none hover:border-card-border/60'
              ]"
            >
              <!-- Reply context inside message bubble -->
              <div
                v-if="msg.parentId && msg.parentContent"
                @click="scrollToMessage(msg.parentId)"
                :class="[
                  'mb-2 p-2 border-l-2 text-[11px] rounded transition-all duration-150 cursor-pointer select-none max-w-full truncate',
                  msg.userId === currentUserId
                    ? 'bg-white/10 hover:bg-white/20 border-white/40 text-white/90'
                    : 'bg-surface/50 border-action-color/60 text-muted hover:bg-surface/85'
                ]"
                :title="t('chat.quoteLabel')"
              >
                <span class="block font-bold mb-0.5 opacity-90">@{{ msg.parentSenderName }}</span>
                <span class="italic font-medium">{{ msg.parentContent }}</span>
              </div>

              <!-- Message Text -->
              <p class="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                {{ msg.content }}
              </p>

              <!-- Timestamp inside bubble -->
              <span
                :class="[
                  'block text-[9px] mt-1.5 select-none font-medium',
                  msg.userId === currentUserId ? 'text-white/60 text-right' : 'text-muted/80 text-left'
                ]"
              >
                {{ formatTime(msg.createdAt) }}
              </span>

              <!-- Fast Reply Overlay Button on Hover -->
              <button
                @click="startReply(msg)"
                :class="[
                  'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 p-2 bg-surface hover:bg-surface-hover border border-surface-border text-foreground hover:text-action-color shadow-lg rounded-xl transition-all duration-200 focus:opacity-100 z-10 shrink-0',
                  msg.userId === currentUserId ? 'left-[-46px]' : 'right-[-46px]'
                ]"
                title="Antworten"
              >
                <Reply class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Sticky Scroll to Bottom Button -->
    <Transition name="fade">
      <button
        v-if="showScrollBottomBtn"
        @click="scrollToBottom(true)"
        class="absolute bottom-24 right-6 p-3 bg-action-color hover:bg-action-hover text-white rounded-full shadow-2xl border border-action-color/20 hover:scale-110 active:scale-95 transition-all duration-200 z-50 animate-bounce"
        title="Nach unten scrollen"
      >
        <ArrowDown class="w-4 h-4" />
      </button>
    </Transition>

    <!-- Typing Indicator Area -->
    <div class="px-6 py-2 h-7 flex items-center shrink-0">
      <Transition name="fade">
        <div v-if="typingDisplay" class="flex items-center gap-2 text-[11px] text-muted font-bold select-none animate-pulse">
          <div class="flex gap-1">
            <span class="w-1 h-1 bg-muted rounded-full animate-bounce"></span>
            <span class="w-1 h-1 bg-muted rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-1 h-1 bg-muted rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
          <span>{{ typingDisplay }}</span>
        </div>
      </Transition>
    </div>

    <!-- Bottom Input Bar & Active Reply Area -->
    <div class="border-t border-surface-border bg-surface-hover/20 backdrop-blur-sm shrink-0">
      <!-- Active Reply context header -->
      <Transition name="slide-up">
        <div
          v-if="replyParent"
          class="flex items-center justify-between px-6 py-3.5 bg-surface/90 border-b border-surface-border/60 text-xs text-muted"
        >
          <div class="flex items-center gap-2 border-l-2 border-action-color pl-2.5 truncate max-w-[85%]">
            <Reply class="w-3.5 h-3.5 text-action-color shrink-0" />
            <span class="truncate font-semibold select-none">
              {{ t('chat.replyingTo') }} <strong class="text-foreground">@{{ replyParent.senderName }}</strong>:
              <span class="italic text-muted font-normal ml-1">"{{ replyParent.content }}"</span>
            </span>
          </div>
          <button
            @click="replyParent = null"
            class="p-1.5 hover:text-foreground hover:bg-surface-hover rounded-full transition-all duration-200 shrink-0"
            title="Antwort abbrechen"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </Transition>

      <!-- Input Actions and Textarea -->
      <form @submit.prevent="sendMessage" class="p-4 flex items-center gap-3">
        <div class="flex-1 relative flex items-center bg-card-bg/60 border border-card-border/40 focus-within:border-action-color/60 focus-within:ring-2 focus-within:ring-action-color/10 rounded-2xl transition-all duration-200">
          <textarea
            id="chat-input-field"
            v-model="messageInput"
            @input="handleInput"
            @keydown.enter.prevent="sendMessage"
            rows="1"
            class="flex-1 py-3.5 pl-4 pr-12 bg-transparent text-sm text-foreground focus:outline-none placeholder-muted/80 resize-none max-h-24 scrollbar-hide font-medium"
            :placeholder="t('chat.placeholder')"
            required
            maxlength="1000"
          ></textarea>
        </div>

        <button
          type="submit"
          :disabled="!messageInput.trim()"
          class="p-4 bg-action-color hover:bg-action-hover disabled:bg-surface-hover disabled:text-muted text-white rounded-2xl shadow-lg border border-action-color/15 hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none transition-all duration-200 shrink-0 flex items-center justify-center"
        >
          <Send class="w-4 h-4" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Scoped transitions and effects */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease, padding 0.2s ease;
  max-height: 50px;
  overflow: hidden;
}
.slide-up-enter-from,
.slide-up-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

@keyframes flash-message-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    border-color: rgba(99, 102, 241, 0.2);
  }
  50% {
    box-shadow: 0 0 16px 4px rgba(99, 102, 241, 0.45);
    border-color: rgba(99, 102, 241, 0.85);
    transform: scale(1.015);
  }
}

.flash-message {
  animation: flash-message-pulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) 1;
  transition: all 0.3s ease;
}

/* Hide scrollbar for clean card overlay and text areas */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
