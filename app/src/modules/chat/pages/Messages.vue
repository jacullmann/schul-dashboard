<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { MessageCircle, Info } from '@lucide/vue';
import { useMessages } from '../composables/useMessages';

// Sub-components
import ChatMessageBubble from '../components/ChatMessageBubble.vue';
import ChatContextMenu from '../components/ChatContextMenu.vue';
import ChatInput from '../components/ChatInput.vue';
import ChatScrollButton from '../components/ChatScrollButton.vue';

const { t } = useI18n();

const {
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
  scrollToBottom,
  handleScroll,
  fetchMessages,
  sendMessage,
  handleInput,
  startReply,
  scrollToMessage,
  typingDisplay,
  canDeleteMessage,
  copyMessage,
  deleteMessage,
} = useMessages();
</script>

<template>
  <div
    class="chat-container min-h-0 flex flex-col overflow-hidden relative p-0 animate-fade-up"
  >
    <div
      ref="messageContainer"
      class="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar scroll-smooth bg-canvas"
      @scroll="handleScroll"
    >
      <div
        v-if="loading"
        class="h-full flex flex-col justify-center items-center"
      >
        <BaseSpinner size="32px" />
      </div>

      <div
        v-else-if="error"
        class="h-full flex flex-col justify-center items-center gap-3 text-danger p-6 text-center"
      >
        <Info :size="40" />
        <span class="text-sm font-semibold tracking-tight">{{ error }}</span>
        <BaseButton variant="ghost" on="ghost" @click="fetchMessages">
          Erneut laden
        </BaseButton>
      </div>

      <template v-else>
        <BaseEmptyState
          v-if="messages.length === 0"
          :icon="MessageCircle"
          class="animate-fade-up"
        >
          <template #title>{{ t('chat.no_messages') }}</template>
        </BaseEmptyState>

        <TransitionGroup name="msg-list">
          <div
            v-for="(msg, index) in messages"
            :key="msg.id"
            class="w-full flex flex-col items-stretch"
          >
            <!-- New Messages Divider -->
            <Transition name="fade">
              <div
                v-if="
                  index === firstNewMessageIndex && !dismissedNewMessagesDivider
                "
                class="flex items-center my-6 px-4 md:px-8 select-none"
              >
                <div class="flex-1 border-t border-danger/30"></div>
                <span
                  class="mx-4 text-xs font-bold text-danger tracking-wider uppercase bg-canvas px-2.25 py-0.5 rounded-full border border-danger/20 shadow-sm"
                >
                  {{
                    messages.length >= 100 && firstNewMessageIndex === 0
                      ? '100+ ' + t('chat.new_messages')
                      : t('chat.new_messages')
                  }}
                </span>
                <div class="flex-1 border-t border-danger/30"></div>
              </div>
            </Transition>

            <!-- Refactored Message Bubble -->
            <ChatMessageBubble
              :msg="msg"
              :is-grouped="isGroupedWithPrevious(msg, index)"
              :current-user-id="currentUserId"
              @reply="startReply"
              @menu="openMenu"
              @scroll-to-message="scrollToMessage"
            />
          </div>
        </TransitionGroup>

        <!-- Refactored Message Context Menu -->
        <ChatContextMenu
          ref="menuRef"
          :active-message="activeMessage"
          :can-delete="activeMessage ? canDeleteMessage(activeMessage) : false"
          :context-menu-styles="contextMenuStyles"
          :is-mobile="isMobile"
          @close="activeMessage = null"
          @copy="copyMessage"
          @delete="deleteMessage"
        />

        <div class="px-6 py-1 h-6 mt-4 flex items-center shrink-0 bg-canvas">
          <Transition name="fade">
            <div
              v-if="typingDisplay"
              class="flex items-center gap-2.5 text-sm text-on-ghost-muted font-bold select-none"
            >
              <div class="flex items-center gap-0.75 h-2">
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

    <!-- Refactored Scroll-to-Bottom Arrow Button -->
    <ChatScrollButton
      :show="showScrollBottomBtn"
      @click="scrollToBottom(true)"
    />

    <!-- Refactored Message Input Area -->
    <ChatInput
      v-model="messageInput"
      :reply-parent="replyParent"
      :can-send="canSend"
      @submit="sendMessage"
      @input="handleInput"
      @cancel-reply="replyParent = null"
    />
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
