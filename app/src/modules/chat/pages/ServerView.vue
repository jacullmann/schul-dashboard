<script setup lang="ts">
import { ref, nextTick, computed, watch, onMounted } from 'vue';
import {
  AudioLines,
  ArrowUp,
  Search,
  Square,
  ChevronRight,
  SquarePen,
  Globe,
  Image,
  Brain,
  CalendarFold,
} from '@lucide/vue';
import ModelSelect from '@/modules/chat/components/ModelSelect.vue';
import ToolMenu from '@/modules/chat/components/ToolMenu.vue';
import FileMenu from '@/modules/chat/components/FileMenu.vue';
import ModelSelectionCards from '@/modules/chat/components/ModelSelectionCards.vue';
import { useToast } from '@/common/composables/useToast';
import { useWindowSize } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useAuth } from '@/modules/chat/composables/useAuth';
import { useMatchmaking } from '@/modules/chat/composables/useMatchmaking';
import { useChatSession } from '@/modules/chat/composables/useChatSession';

const router = useRouter();
const windowWidth = useWindowSize().width;
const toast = useToast();

const { user, profile, joinGame, initializeAuth } = useAuth();
const { startSearching, cancelSearch, session, isSearching } = useMatchmaking();

const currentSessionId = ref<string | null>(null);
const chat = ref<ReturnType<typeof useChatSession> | null>(null);
const pendingMessage = ref('');

onMounted(() => {
  initializeAuth();
});

watch(session, (newSession) => {
  if (
    newSession?.status === 'active' &&
    newSession.id !== currentSessionId.value
  ) {
    currentSessionId.value = newSession.id;
    const sessionChat = useChatSession(newSession.id);
    chat.value = sessionChat;
    sessionChat.initializeChat();

    // Send pending message if any
    if (pendingMessage.value) {
      sessionChat.sendMessage(pendingMessage.value);
      pendingMessage.value = '';
    }
  }
});

// Optional: Notify when the opponent leaves
watch(
  () => chat.value?.isOpponentConnected,
  (isConnected) => {
    if (isConnected === false && session.value?.status === 'active') {
      toast.info('The user has disconnected from the chat.');
    }
  },
);

const webSearch = ref(true);
const createImage = ref(false);
const ponder = ref(false);
const answerLeisurely = ref(false);

const mockMessages = computed(() => {
  const currentChat = chat.value;
  if (!currentChat) return [];
  return currentChat.messages.map((m) => ({
    id: m.id,
    role: m.sender_id === user.value?.id ? 'assistant' : 'human',
    content: m.content,
  }));
});

const userInput = ref('');

watch(userInput, () => {
  handleInput();
});

const selectedModel = ref('pro');

const isLockedIn = computed(
  () => isSearching.value || session.value?.status === 'active',
);

const handleModelChangeRequest = async (newModel: string) => {
  await clearChat();
  selectedModel.value = newModel;
  toast.info(`Switched to the ${newModel} model. Started a new chat.`);
};

const isWaitingForResponse = computed(() => {
  if (session.value?.status !== 'active') return false;
  if (mockMessages.value.length === 0) return true;
  return (
    mockMessages.value[mockMessages.value.length - 1]?.role === 'assistant'
  );
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

// 2. The magic resize function + Typing indicator trigger
const handleInput = async () => {
  // Trigger typing indicator
  if (chat.value && userInput.value.trim().length > 0) {
    chat.value.setTyping(true);
  }

  await nextTick();

  const textarea = textareaRef.value;
  if (!textarea) return;

  const currentHeight = textarea.style.height || `${textarea.clientHeight}px`;
  textarea.style.transition = 'none';
  textarea.style.height = 'auto';
  const targetHeight = textarea.scrollHeight;
  textarea.style.height = currentHeight;
  void textarea.offsetHeight;
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

// 3. New specific handler for the Find User button
async function handleFindUser() {
  if (isSearching.value) return;

  try {
    if (!profile.value) {
      await joinGame('ai');
    }
    await startSearching();
  } catch (e: any) {
    toast.error(e.message || 'Failed to find user');
  }
}

// 4. Send function updated to ONLY handle sending messages
async function send() {
  if (isThinking.value) return;
  const content = userInput.value.trim();
  if (!content && !pendingMessage.value) return;

  if (session.value?.status !== 'active') {
    toast.error('You must find a user before sending a message.');
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

watch(
  () => mockMessages.value.length,
  () => {
    nextTick(scrollToBottom);
  },
);

// 5. Fully clears the chat AND resets the matchmaking state
async function clearChat() {
  if (chat.value) {
    await chat.value.leaveChat();
    chat.value = null;
    currentSessionId.value = null;
  }
  await cancelSearch(); // Critical: Resets the queue so you can search again
  userInput.value = '';
}

// Voice Recognition
const isListening = ref(false);
let recognition: any = null;

const toggleSpeechRecognition = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toast.error('Speech recognition is not supported in this browser.');
    return;
  }

  if (isListening.value) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening.value = true;
  };

  recognition.onresult = (event: any) => {
    const transcript = Array.from(event.results)
      .map((result: any) => result[0])
      .map((result) => result.transcript)
      .join('');

    userInput.value = transcript;
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
    isListening.value = false;
    if (event.error === 'not-allowed') {
      toast.error('Microphone access denied.');
    }
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  recognition.start();
};
</script>

<template>
  <div class="h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
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
      class="flex-1 overflow-y-auto w-full relative custom-scrollbar"
    >
      <TransitionGroup
        tag="div"
        name="message"
        class="w-full max-w-[800px] mx-auto px-4 pt-12 pb-8 flex flex-col gap-2 min-h-full"
      >
        <div
          v-for="message in mockMessages"
          :key="message.id"
          class="flex"
          :class="message.role === 'human' ? 'justify-start' : 'justify-end'"
        >
          <div
            v-if="message.role === 'human'"
            class="bg-surface border border-surface-border py-3 px-4 rounded-2xl rounded-tl-md max-w-[75%] break-words text-left"
          >
            {{ message.content }}
          </div>
          <div v-else class="bg-transparent py-3 px-2 break-words text-right">
            <span
              v-for="(word, index) in message.content.split(' ')"
              :key="index"
              class="word-animate"
              :style="{ animationDelay: index * 30 + 'ms' }"
            >
              {{ word }}&nbsp;
            </span>
          </div>
        </div>

        <div v-if="isThinking" key="thinking" class="flex justify-start">
          <div class="p-2 flex items-center gap-2">
            <BaseSpinner on="ghost" size="20" />
            <span class="text-body text-on-surface-muted">{{
              isSearching ? 'Searching for user...' : 'Waiting for request...'
            }}</span>
          </div>
        </div>
      </TransitionGroup>
    </main>

    <div class="w-full relative shrink-0 z-10 flex flex-col items-center pb-2">
      <div
        class="absolute bottom-full left-0 w-full h-16 bg-gradient-to-t from-background to-transparent pointer-events-none transition-opacity duration-500"
        :class="mockMessages.length === 0 ? 'opacity-0' : 'opacity-100'"
      ></div>
      <div
        class="absolute inset-0 w-full h-full bg-background pointer-events-none transition-opacity duration-500"
        :class="mockMessages.length === 0 ? 'opacity-0' : 'opacity-100'"
      ></div>

      <div
        class="w-full max-w-[800px] px-4 pointer-events-auto relative transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
        :class="
          mockMessages.length === 0 ? '-translate-y-[35vh]' : 'translate-y-0'
        "
      >
        <Transition
          enter-active-class="transition-opacity duration-300"
          enter-from-class="opacity-0"
          leave-active-class="transition-opacity duration-300"
          leave-to-class="opacity-0"
        >
          <div
            v-if="mockMessages.length === 0"
            class="absolute bottom-[calc(100%+3rem)] left-0 w-full text-center"
          >
            <div class="text-4xl font-normal text-on-surface mb-2">
              Want to try being an <b>LLM</b>?
            </div>

            <Transition
              enter-active-class="transition-opacity duration-300 delay-150"
              enter-from-class="opacity-0"
              leave-active-class="transition-opacity duration-300"
              leave-to-class="opacity-0"
            >
              <ModelSelectionCards v-if="!isLockedIn" v-model="selectedModel" />
            </Transition>
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
              @input="handleInput"
              @keydown.enter.exact.prevent="send"
              rows="1"
              placeholder="Respond to the user"
              class="w-full py-2 px-3 leading-6 bg-transparent rounded-none border-none outline-none shadow-none text-on-surface text-body placeholder:text-on-surface-subtle resize-none overflow-y-auto max-h-[240px] block box-border m-0 custom-scrollbar"
            ></textarea>

            <BaseRow justify="between">
              <BaseRow>
                <FileMenu />
                <ToolMenu
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
                  <BaseButton
                    v-if="
                      mockMessages.length === 0 &&
                      !isSearching &&
                      session?.status !== 'active'
                    "
                    :icon="Search"
                    variant="action"
                    type="button"
                    size="lg"
                    @click.prevent="handleFindUser"
                    :disabled="isSearching"
                  >
                    Find User
                  </BaseButton>
                  <BaseTooltip
                    v-else-if="isThinking"
                    key="cancel"
                    content="Cancel"
                    placement="bottom"
                  >
                    <BaseButton
                      :icon="Square"
                      size="lg"
                      @click="handleCancel"
                      variant="action"
                      :fill="true"
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
              v-if="mockMessages.length > 0"
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
                @click="router.push('/natural-intelligence/chat')"
              >
                Talk to an "AI"
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
