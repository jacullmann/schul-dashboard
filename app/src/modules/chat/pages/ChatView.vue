<script setup lang="ts">
import { ref, nextTick, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  AudioLines,
  ArrowUp,
  Square,
  ChevronRight,
  SquarePen,
  Globe,
  Image,
  Brain,
  CalendarFold,
  Flag,
  Copy,
} from '@lucide/vue';
import ModelSelect from '@/modules/chat/components/ModelSelect.vue';
import ChatToolSelect from '@/modules/chat/components/ChatToolSelect.vue';
import FileMenu from '@/modules/chat/components/FileMenu.vue';
import { useToast } from '@/common/composables/useToast';
import { useWindowSize } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useAuth } from '@/modules/chat/composables/useAuth';
import { useMatchmaking } from '@/modules/chat/composables/useMatchmaking';
import { useChatSession } from '@/modules/chat/composables/useChatSession';
import { useReports } from '@/modules/chat/composables/useReports';
import { useClipboard } from '@vueuse/core';

const { copy, copied } = useClipboard();

const router = useRouter();
const windowWidth = useWindowSize().width;

const { user, profile, joinGame, initializeAuth } = useAuth();
const { startSearching, cancelSearch, session, isSearching, recoverSession } = useMatchmaking();
const { submitReport, isSubmitting, error, success, resetReportState } =
  useReports();

const currentSessionId = ref<string | null>(null);
const chat = ref<ReturnType<typeof useChatSession> | null>(null);
const pendingMessage = ref('');

onMounted(async () => {
  await initializeAuth();
  if (profile.value) {
    await recoverSession();
  }
});

onUnmounted(() => {
  if (chat.value) {
    chat.value.destroy();
  }
});

watch(session, async (newSession) => {
  if (
    newSession?.status === 'active' &&
    newSession.id !== currentSessionId.value
  ) {
    currentSessionId.value = newSession.id;
    const sessionChat = useChatSession(newSession.id);
    chat.value = sessionChat;
    await sessionChat.initializeChat();

    // Send pending message if any
    if (pendingMessage.value) {
      sessionChat.sendMessage(pendingMessage.value);
      pendingMessage.value = '';
    }
  }
}, { immediate: true });

const webSearch = ref(true);
const createImage = ref(false);
const ponder = ref(false);
const answerLeisurely = ref(false);

interface UIMessage {
  id: string;
  role: 'human' | 'assistant';
  content: string;
  sender_id?: string;
}

const displayMessages = computed<UIMessage[]>(() => {
  const messages: UIMessage[] = [];

  if (chat.value) {
    messages.push(...chat.value.messages.map((m) => ({
      id: m.id,
      role: m.sender_id === user.value?.id ? 'human' : 'assistant',
      content: m.content,
      sender_id: m.sender_id,
    })));
  }

  if (pendingMessage.value) {
    messages.push({
      id: 'pending',
      role: 'human',
      content: pendingMessage.value,
      sender_id: user.value?.id,
    });
  }

  return messages;
});

const userInput = ref('');

watch(userInput, () => {
  autoResize();
});

const selectedModel = ref('pro');

const isLockedIn = computed(
  () => isSearching.value || session.value?.status === 'active',
);

const handleModelChangeRequest = async (newModel: string) => {
  await clearChat();
  selectedModel.value = newModel;
  useToast().info(`Switched to the ${newModel} model. Started a new chat.`);
};

const isWaitingForResponse = computed(() => {
  if (session.value?.status !== 'active') return false;
  if (displayMessages.value.length === 0) return false;
  return displayMessages.value[displayMessages.value.length - 1]?.role === 'human';
});

const isThinking = computed(
  () =>
    isSearching.value ||
    isWaitingForResponse.value ||
    (chat.value?.isOpponentTyping ?? false),
);

const handleCancel = async () => {
  if (isSearching.value) {
    await cancelSearch();
  } else if (isThinking.value) {
    await clearChat();
  }
};

// 1. Template refs mapping to your HTML elements
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const chatContainer = ref<HTMLElement | null>(null);

// 2. The magic resize function
const autoResize = async () => {
  await nextTick(); // Wait for Vue to update the v-model

  const textarea = textareaRef.value;
  if (!textarea) return;

  // 1. Capture the current height before we mess with it
  const currentHeight = textarea.style.height || `${textarea.clientHeight}px`;

  // 2. Disable transitions temporarily to calculate the new height instantly
  textarea.style.transition = 'none';
  textarea.style.height = 'auto';
  const targetHeight = textarea.scrollHeight;

  // 3. Revert back to the exact starting height
  textarea.style.height = currentHeight;

  // 4. Force a browser reflow (This is the magic line that makes the transition work)
  void textarea.offsetHeight;

  // 5. Re-enable the transition and set the new target height
  // You can adjust the timing (0.2s) and easing curve here
  textarea.style.transition = 'height 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
  textarea.style.height = `${targetHeight}px`;
};

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth',
    });
  }
};

async function send() {
  if (isThinking.value) return;
  const content = userInput.value.trim();
  if (!content && !pendingMessage.value) return;

  if (!profile.value) {
    pendingMessage.value = content;
    userInput.value = '';
    try {
      await joinGame('human');
      await startSearching();
    } catch (e: any) {
      pendingMessage.value = '';
      useToast().error(e.message || 'Failed to join game');
    }
    return;
  }

  if (session.value?.status !== 'active') {
    if (content) {
      pendingMessage.value = content;
      userInput.value = '';
    }
    if (!isSearching.value) {
      try {
        await startSearching();
      } catch (e: any) {
        pendingMessage.value = '';
        useToast().error(e.message || 'Failed to start searching');
      }
    }
    return;
  }

  if (chat.value) {
    await chat.value.sendMessage(content);
    userInput.value = '';

    nextTick(() => {
      scrollToBottom();
    });
  }
}

// Watch for new messages to scroll
watch(
  () => displayMessages.value.length,
  () => {
    nextTick(scrollToBottom);
  },
);

async function clearChat() {
  if (chat.value) {
    await chat.value.leaveChat();
    chat.value = null;
    currentSessionId.value = null;
  }
  await cancelSearch();
  userInput.value = '';
}

async function handleReport(message: UIMessage, reason: string) {
  const isSuccessful = await submitReport(
    message.sender_id || '',
    message.id,
    message.content,
    reason,
  );

  if (isSuccessful) {
    useToast().success(
      'Report submitted successfully. Our team will review it.',
    );
    // Close modal, etc.
  } else {
    useToast().error(error.value || 'Failed to submit report.');
  }
}

// Voice Recognition
const isListening = ref(false);
let recognition: any = null;

const toggleSpeechRecognition = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    useToast().error('Speech recognition is not supported in this browser.');
    return;
  }

  if (isListening.value) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true; // Shows text as you speak
  recognition.continuous = false; // Stops when you stop speaking

  recognition.onstart = () => {
    isListening.value = true;
  };

  recognition.onresult = (event: any) => {
    // Get the latest transcript
    const transcript = Array.from(event.results)
      .map((result: any) => result[0])
      .map((result) => result.transcript)
      .join('');

    // Update your existing userInput ref
    userInput.value = transcript;
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
    isListening.value = false;
    if (event.error === 'not-allowed') {
      useToast().error('Microphone access denied.');
    }
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  recognition.start();
};
</script>

<template>
  <div class="h-[100dvh] w-full flex flex-col overflow-hidden bg-canvas">
    <div
      class="absolute top-2 left-2 bg-surface border border-surface-border z-1 rounded-full p-1"
    >
      <BaseTooltip content="New Chat" placement="bottom">
        <BaseButton
          :variant="'ghost'"
          size="lg"
          class="z-10"
          :icon="SquarePen"
          @click="clearChat"
        />
      </BaseTooltip>
    </div>

    <main
      ref="chatContainer"
      class="flex-1 overflow-y-auto w-full relative custom-scrollbar min-h-100"
    >
      <TransitionGroup
        tag="div"
        name="message"
        class="w-full max-w-[800px] mx-auto px-4 pt-12 pb-8 flex flex-col min-h-full"
      >
        <div
          v-for="message in displayMessages"
          :key="message.id"
          class="flex"
          :class="message.role === 'human' ? 'justify-end' : 'justify-start'"
        >
          <div
            v-if="message.role === 'human'"
            class="bg-surface border border-surface-border py-3 px-4 mb-12 rounded-2xl max-w-[75%] break-words text-left"
          >
            {{ message.content }}
          </div>
          <div
            v-else
            class="bg-transparent py-3 px-2 break-words text-left group"
          >
            <span
              v-for="(word, index) in message.content.split(' ')"
              :key="index"
              class="word-animate"
              :style="{ animationDelay: index * 30 + 'ms' }"
            >
              {{ word }}&nbsp;
            </span>
            <BaseRow class="mt-2 z-10 opacity-0 group-hover:opacity-100 gap-0!">
              <BaseTooltip content="Report" placement="bottom">
                <BaseButton
                  :variant="'ghost'"
                  size="md"
                  :icon="Flag"
                  @click="handleReport(message, 'Inappropriate content')"
                />
              </BaseTooltip>
              <BaseTooltip content="Copy" placement="bottom">
                <BaseButton
                  :variant="'ghost'"
                  size="md"
                  :icon="Copy"
                  @click="
                    (copy(message.content),
                    useToast().success('Copied to clipboard'))
                  "
                />
              </BaseTooltip>
            </BaseRow>
          </div>
        </div>

        <!-- Thinking Indicator -->
        <div v-if="isThinking" key="thinking" class="flex justify-start">
          <div class="p-2 flex items-center gap-2">
            <BaseSpinner on="ghost" size="20" />
            <span class="text-body text-on-surface-muted">{{
              isSearching ? 'Connecting...' : 'Thinking...'
            }}</span>
          </div>
        </div>
      </TransitionGroup>
    </main>

    <div class="w-full relative shrink-0 z-10 flex flex-col items-center pb-2">
      <div
        class="absolute bottom-full left-0 w-full h-16 bg-gradient-to-t from-background to-transparent pointer-events-none transition-opacity duration-500"
        :class="displayMessages.length === 0 ? 'opacity-0' : 'opacity-100'"
      ></div>
      <div
        class="absolute inset-0 w-full h-full bg-background pointer-events-none transition-opacity duration-500"
        :class="displayMessages.length === 0 ? 'opacity-0' : 'opacity-100'"
      ></div>

      <div
        class="w-full max-w-[800px] px-4 pointer-events-auto relative transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
        :class="
          displayMessages.length === 0 ? '-translate-y-[35vh]' : 'translate-y-0'
        "
      >
        <Transition
          enter-active-class="transition-opacity duration-300"
          enter-from-class="opacity-0"
          leave-active-class="transition-opacity duration-300"
          leave-to-class="opacity-0"
        >
          <div
            v-if="displayMessages.length === 0"
            class="absolute bottom-[calc(100%+3rem)] left-0 w-full text-center"
          >
            <div class="text-4xl font-normal text-on-surface">
              Tired of talking to <b>artificial</b> intelligence?
            </div>
          </div>
        </Transition>

        <form @submit.prevent="send" novalidate class="relative w-full z-20">
          <div
            class="p-3 rounded-[32px] flex flex-col gap-2 bg-surface border border-surface-border w-full shadow-sm"
          >
            <textarea
              id="user-input"
              ref="textareaRef"
              v-model="userInput"
              @input="autoResize"
              @keydown.enter.exact.prevent="send"
              rows="1"
              placeholder="Ask Natural Intelligence"
              class="w-full py-2 px-3 leading-6 bg-transparent rounded-none border-none outline-none shadow-none text-on-surface text-body placeholder:text-on-surface-subtle resize-none overflow-y-auto max-h-[240px] block box-border m-0 custom-scrollbar"
            ></textarea>

            <BaseRow justify="between">
              <BaseRow>
                <FileMenu />
                <ChatToolSelect
                  v-model:webSearch="webSearch"
                  v-model:createImage="createImage"
                  v-model:ponder="ponder"
                  v-model:answerLeisurely="answerLeisurely"
                />

                <BaseTooltip
                  v-if="webSearch && windowWidth > 660"
                  content="Web search"
                  placement="bottom"
                  class=""
                >
                  <BaseButton
                    size="lg"
                    :chip="true"
                    :icon="Globe"
                    @click="webSearch = false"
                  />
                </BaseTooltip>
                <BaseTooltip
                  v-if="createImage && windowWidth > 660"
                  content="Create image"
                  placement="bottom"
                >
                  <BaseButton
                    size="lg"
                    :chip="true"
                    :icon="Image"
                    @click="createImage = false"
                  />
                </BaseTooltip>
                <BaseTooltip
                  v-if="ponder && windowWidth > 660"
                  content="Ponder"
                  placement="bottom"
                >
                  <BaseButton
                    size="lg"
                    :chip="true"
                    :icon="Brain"
                    @click="ponder = false"
                  />
                </BaseTooltip>
                <BaseTooltip
                  v-if="answerLeisurely && windowWidth > 660"
                  content="Answer leisurely"
                  placement="bottom"
                >
                  <BaseButton
                    size="lg"
                    :chip="true"
                    :icon="CalendarFold"
                    @click="answerLeisurely = false"
                  />
                </BaseTooltip>
              </BaseRow>

              <BaseRow>
                <ModelSelect
                  v-model="selectedModel"
                  :isLocked="isLockedIn"
                  @require-reset="handleModelChangeRequest"
                />
                <Transition
                  mode="out-in"
                  enter-active-class="transition-opacity duration-150 ease-in-out"
                  enter-from-class="opacity-0"
                  leave-active-class="transition-opacity duration-150 ease-in-out"
                  leave-to-class="opacity-0"
                >
                  <BaseTooltip
                    v-if="isThinking"
                    key="cancel"
                    content="Cancel"
                    placement="bottom"
                  >
                    <BaseButton
                      :icon="Square"
                      :fill="true"
                      variant="action"
                      type="button"
                      @click="handleCancel"
                      size="lg"
                    />
                  </BaseTooltip>
                  <BaseTooltip
                    v-else-if="!userInput"
                    key="voice"
                    content="Use voice"
                    placement="bottom"
                  >
                    <BaseButton
                      :icon="AudioLines"
                      size="lg"
                      @click="toggleSpeechRecognition"
                      :variant="isListening ? 'action' : 'ghost'"
                    />
                  </BaseTooltip>
                  <BaseTooltip
                    v-else
                    key="submit"
                    content="Submit"
                    placement="bottom"
                  >
                    <BaseButton
                      :icon="ArrowUp"
                      variant="action"
                      type="submit"
                      size="lg"
                    />
                  </BaseTooltip>
                </Transition>
              </BaseRow>
            </BaseRow>
          </div>
        </form>

        <div class="w-full flex justify-center items-center z-10 relative">
          <Transition
            mode="out-in"
            enter-active-class="transition-opacity duration-300 delay-300"
            enter-from-class="opacity-0"
            leave-active-class="transition-opacity duration-200"
            leave-to-class="opacity-0"
          >
            <div
              v-if="displayMessages.length > 0"
              key="disclaimer"
              class="text-xs text-center text-on-surface-subtle m-4 mb-2"
            >
              Natural Intelligence makes mistakes. Don't share personal data
            </div>
            <BaseRow v-else>
              <BaseButton
                key="button"
                type="button"
                variant="ghost"
                size="lg"
                class="mt-4"
                @click="router.push('/natural-intelligence')"
              >
                Learn more
              </BaseButton>
              <BaseButton
                key="button"
                type="button"
                variant="action"
                size="lg"
                :icon="ChevronRight"
                icon-placement="trailing"
                class="mt-4"
                @click="router.push('/natural-intelligence/server')"
              >
                Become an AI
              </BaseButton>
            </BaseRow>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-enter-active {
  transition: all 0.4s cubic-bezier(0.2, 1, 0.3, 1);
}
.message-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

@keyframes word-reveal {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.word-animate {
  display: inline-block;
  opacity: 0;
  animation: word-reveal 0.3s ease forwards;
}
</style>