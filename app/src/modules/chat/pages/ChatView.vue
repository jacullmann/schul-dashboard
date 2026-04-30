<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  ArrowUp,
  AudioLines,
  Brain,
  CalendarFold,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Flag,
  Globe,
  Image,
  Lightbulb,
  Search,
  Sparkles,
  Square,
  SquarePen,
  Terminal,
  Zap,
} from '@lucide/vue';
import ChatLogo from '@/modules/chat/components/ChatLogo.vue';
import ModelSelect from '@/modules/chat/components/ModelSelect.vue';
import ChatToolSelect from '@/modules/chat/components/ChatToolSelect.vue';
import FileMenu from '@/modules/chat/components/FileMenu.vue';
import { useToast } from '@/common/composables/useToast';
import { useClipboard, useWindowSize, useResizeObserver } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useAuth } from '@/modules/chat/composables/useAuth';
import { useMatchmaking } from '@/modules/chat/composables/useMatchmaking';
import type { AiStep } from '@/modules/chat/composables/useChatSession';
import { useChatSession } from '@/modules/chat/composables/useChatSession';
import { useReports } from '@/modules/chat/composables/useReports';
import { useI18n } from 'vue-i18n';
import { useAnimatedEllipsis } from '@/modules/chat/composables/useAnimatedEllipsis';
import {
  developmentMockMessages,
  developmentMockLiveSteps,
} from '@/modules/chat/mockData';

const USE_MOCK_DATA = import.meta.env.DEV;

const { copy } = useClipboard();

const router = useRouter();
const windowWidth = useWindowSize().width;

const { t } = useI18n();
const dots = useAnimatedEllipsis();

const { user, profile, joinGame, initializeAuth } = useAuth();
const { startSearching, cancelSearch, session, isSearching, recoverSession } =
  useMatchmaking();
const { submitReport, error } = useReports();

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

watch(
  session,
  async (newSession) => {
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
  },
  { immediate: true },
);

const webSearch = ref(true);
const createImage = ref(false);
const ponder = ref(false);
const answerLeisurely = ref(false);

interface UIMessage {
  id: string;
  role: 'human' | 'assistant';
  content: string;
  sender_id?: string;
  steps?: AiStep[];
}

const displayMessages = computed<UIMessage[]>(() => {
  const messages: UIMessage[] = [];

  if (USE_MOCK_DATA) {
    messages.push(...(developmentMockMessages as UIMessage[]));
  }

  if (chat.value) {
    messages.push(
      ...chat.value.messages.map(
        (m): UIMessage => ({
          id: m.id,
          role: m.sender_id === user.value?.id ? 'human' : 'assistant',
          content: m.content,
          sender_id: m.sender_id,
          steps: m.metadata?.steps,
        }),
      ),
    );
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
  if (USE_MOCK_DATA) return true;
  if (session.value?.status !== 'active') return false;
  if (displayMessages.value.length === 0) return false;
  return (
    displayMessages.value[displayMessages.value.length - 1]?.role === 'human'
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
const innerContainerRef = ref<any>(null);
const innerContainerEl = computed(
  () =>
    innerContainerRef.value?.$el || (innerContainerRef.value as HTMLElement),
);
const dynamicSpacerHeight = ref(0);

const calculateSpacer = () => {
  if (!chatContainer.value) return;
  const innerEl = innerContainerEl.value as HTMLElement;
  if (!innerEl) return;

  const humanMessages = innerEl.querySelectorAll('.is-human');
  if (humanMessages.length === 0) {
    dynamicSpacerHeight.value = 0;
    return;
  }
  const lastHumanMsg = humanMessages[humanMessages.length - 1] as HTMLElement;
  const spacerEl = innerEl.querySelector('.chat-spacer') as HTMLElement;
  if (!spacerEl) return;

  const viewportHeight = chatContainer.value.clientHeight;
  const contentHeightBelowHuman = spacerEl.offsetTop - lastHumanMsg.offsetTop;

  const newHeight = Math.max(0, viewportHeight - contentHeightBelowHuman);

  if (Math.abs(dynamicSpacerHeight.value - newHeight) > 1) {
    dynamicSpacerHeight.value = newHeight;
  }
};

useResizeObserver(chatContainer, calculateSpacer);
useResizeObserver(innerContainerEl, calculateSpacer);

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
    nextTick(() => {
      calculateSpacer();
      scrollToBottom();
    });
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
  } else if (error.value === 'already_reported') {
    useToast().info(
      'This message has already been reported. Thank you for your vigilance!',
    );
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
    // Update your existing userInput ref
    userInput.value = Array.from(event.results)
      .map((result: any) => result[0])
      .map((result) => result.transcript)
      .join('');
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

// ─── Human Message Collapsing ──────────────────────────────────────────────────

const overflowingHumanMessages = ref<Record<string, boolean>>({});
const expandedHumanMessages = ref<Record<string, boolean>>({});

function toggleHumanMessage(id: string) {
  expandedHumanMessages.value[id] = !expandedHumanMessages.value[id];
}

const checkHumanMessageOverflow = (
  el: Element | ComponentPublicInstance | null,
  id: string,
) => {
  if (!el) return;
  const htmlEl = el as HTMLElement;

  window.requestAnimationFrame(() => {
    if (!expandedHumanMessages.value[id]) {
      const isOverflowing = htmlEl.scrollHeight > htmlEl.clientHeight;
      if (overflowingHumanMessages.value[id] !== isOverflowing) {
        overflowingHumanMessages.value[id] = isOverflowing;
      }
    }
  });
};

// ─── Step History ─────────────────────────────────────────────────────────────

/** Whether the step history panel is expanded */
const isStepHistoryExpanded = ref(false);

/** Per-message expanded state keyed by message id */
const expandedMessageSteps = ref<Record<string, boolean>>({});

function toggleMessageSteps(messageId: string) {
  expandedMessageSteps.value[messageId] =
    !expandedMessageSteps.value[messageId];
}

function isMessageStepsExpanded(messageId: string) {
  return !!expandedMessageSteps.value[messageId];
}

/**
 * The live steps being accumulated for the currently-in-progress response.
 * Reads from the chat composable's reactive `aiSteps` ref.
 */
const liveSteps = computed<AiStep[]>(() => {
  if (USE_MOCK_DATA) return developmentMockLiveSteps;
  return chat.value?.aiSteps ?? [];
});

// Collapse the live panel whenever a new response cycle begins (steps reset to 0).
watch(
  () => liveSteps.value.length,
  (len, prevLen) => {
    if (prevLen > 0 && len === 0) {
      isStepHistoryExpanded.value = false;
    }
  },
);

/** Mapping from status key to a Lucide icon component */
const stepIconMap: Record<string, any> = {
  thinking: Lightbulb,
  generating: Sparkles,
  searching: Search,
  creating_image: Image,
  pondering: Brain,
  executing_terminal: Terminal,
};

function getStepIcon(status: string): any {
  return stepIconMap[status] ?? Zap;
}

/**
 * Generate a human-readable label for a step.
 * Falls back to the i18n translation for the status key.
 */
function getStepLabel(step: AiStep): string {
  const base = t(`chat.status.${step.status}`, step.status);
  return step.tool ? `${base}` : base;
}

/**
 * Format a duration in milliseconds to a compact human-readable string.
 */
function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
</script>

<template>
  <div class="h-dvh w-full flex flex-col overflow-hidden bg-canvas">
    <div
      class="absolute top-2 left-2 bg-surface border border-surface-border z-1 rounded-full p-1"
    >
      <BaseTooltip content="New Chat" placement="bottom">
        <BaseButton
          variant="ghost"
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
        ref="innerContainerRef"
        tag="div"
        name="message"
        class="w-full max-w-200 mx-auto px-4 pt-12 pb-8 flex flex-col min-h-full"
      >
        <div
          v-for="message in displayMessages"
          :key="message.id"
          class="flex flex-col"
          :class="[
            message.role === 'human'
              ? 'items-end is-human'
              : 'items-start is-ai',
          ]"
        >
          <!-- Persisted step history for completed assistant messages -->
          <div
            v-if="
              message.role === 'assistant' &&
              message.steps &&
              message.steps.length > 0
            "
            class="flex flex-col gap-0 w-full"
          >
            <BaseButton
              variant="ghost"
              size="md"
              @click="toggleMessageSteps(message.id)"
              :aria-expanded="isMessageStepsExpanded(message.id)"
              :icon="
                isMessageStepsExpanded(message.id) ? ChevronDown : ChevronRight
              "
            >
              <span class="font-medium tracking-tight">
                {{ message.steps.length }} step{{
                  message.steps.length === 1 ? '' : 's'
                }}
              </span>
            </BaseButton>

            <Transition
              enter-active-class="transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]"
              leave-active-class="transition-[opacity,transform] duration-150 ease-in-out"
              enter-from-class="opacity-0 -translate-y-1"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-if="isMessageStepsExpanded(message.id)"
                class="flex flex-col gap-1 py-1 pl-4 border-l-[1.5px] border-canvas-border ml-6"
              >
                <div
                  v-for="(step, idx) in message.steps"
                  :key="idx"
                  class="flex items-center gap-1.75 text-sm px-1 py-0.5 rounded-md transition-colors duration-120 text-on-ghost-muted"
                >
                  <component
                    :is="getStepIcon(step.status)"
                    class="shrink-0"
                    :size="16"
                  />
                  <span
                    class="flex-1 overflow-hidden truncate whitespace-nowrap"
                    >{{ getStepLabel(step) }}</span
                  >
                  <span
                    v-if="step.duration_ms"
                    class="shrink-0 text-[0.68rem] tabular-nums text-on-ghost-subtle ml-auto"
                  >
                    {{ formatDuration(step.duration_ms) }}
                  </span>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Message bubble -->
          <div
            v-if="message.role === 'human'"
            class="flex flex-col items-end max-w-[75%] mb-2"
          >
            <div
              class="bg-surface border border-surface-border flex px-4 rounded-2xl wrap-break-word text-left relative overflow-hidden transition-all duration-300"
              :class="
                overflowingHumanMessages[message.id] ? 'py-3 pr-1' : 'py-3'
              "
            >
              <div
                :ref="(el) => checkHumanMessageOverflow(el, message.id)"
                class="whitespace-pre-wrap transition-colors relative z-0"
                :class="
                  !expandedHumanMessages[message.id] ? 'line-clamp-5' : ''
                "
              >
                {{ message.content }}
              </div>

              <!-- Gradient fade for unexpanded overflowing text -->
              <div
                v-if="
                  !expandedHumanMessages[message.id] &&
                  overflowingHumanMessages[message.id]
                "
                class="absolute bottom-0 left-0 w-full h-8 bg-linear-to-t from-surface to-transparent pointer-events-none z-10"
              ></div>

              <!-- Expand / Collapse Button -->
              <div
                v-if="overflowingHumanMessages[message.id]"
                class="flex justify-end -mt-2 z-20 relative"
              >
                <BaseTooltip
                  :content="
                    expandedHumanMessages[message.id]
                      ? 'Show less'
                      : 'Show more'
                  "
                  placement="top"
                >
                  <BaseButton
                    variant="ghost"
                    :icon="
                      expandedHumanMessages[message.id]
                        ? ChevronUp
                        : ChevronDown
                    "
                    @click="toggleHumanMessage(message.id)"
                  />
                </BaseTooltip>
              </div>
            </div>
          </div>
          <div
            v-else
            class="bg-transparent py-3 px-2 wrap-break-word text-left group w-full"
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
                  variant="ghost"
                  size="sm"
                  :icon="Flag"
                  @click="handleReport(message, 'Inappropriate content')"
                />
              </BaseTooltip>
              <BaseTooltip content="Copy" placement="bottom">
                <BaseButton
                  variant="ghost"
                  size="sm"
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

        <!-- Live Thinking Indicator with collapsible step history -->
        <div v-if="isThinking" key="thinking" class="flex justify-start w-full">
          <div class="flex flex-col gap-2 py-2 px-2 w-full">
            <!-- Live step history (collapsible) — always visible while the AI is responding -->
            <div v-if="!isSearching" class="flex flex-col gap-0 mb-1">
              <BaseButton
                :class="{
                  'cursor-default! opacity-50! hover:bg-transparent! hover:text-on-ghost-subtle!':
                    liveSteps.length === 0,
                }"
                :disabled="liveSteps.length === 0"
                @click="
                  liveSteps.length > 0 &&
                  (isStepHistoryExpanded = !isStepHistoryExpanded)
                "
                :aria-expanded="isStepHistoryExpanded"
                :aria-disabled="liveSteps.length === 0"
                :icon="isStepHistoryExpanded ? ChevronDown : ChevronRight"
                variant="ghost"
              >
                <span class="font-medium tracking-tight">
                  {{ liveSteps.length }} step{{
                    liveSteps.length === 1 ? '' : 's'
                  }}
                </span>
              </BaseButton>

              <Transition
                enter-active-class="transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]"
                leave-active-class="transition-[opacity,transform] duration-150 ease-in-out"
                enter-from-class="opacity-0 -translate-y-1"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div
                  v-if="isStepHistoryExpanded"
                  class="flex flex-col gap-1 py-1 pl-4 border-l-[1.5px] border-canvas-border ml-6"
                >
                  <div
                    v-for="(step, idx) in liveSteps"
                    :key="idx"
                    class="flex items-center gap-1.75 text-sm px-1 py-0.5 rounded-md transition-colors duration-120"
                    :class="
                      idx === liveSteps.length - 1
                        ? 'text-on-ghost'
                        : 'text-on-ghost-muted'
                    "
                  >
                    <component
                      :is="getStepIcon(step.status)"
                      class="shrink-0"
                      :class="{ 'opacity-100!': idx === liveSteps.length - 1 }"
                      :size="16"
                    />
                    <span
                      class="flex-1 overflow-hidden truncate whitespace-nowrap"
                      >{{ getStepLabel(step) }}</span
                    >
                    <span
                      v-if="step.duration_ms"
                      class="shrink-0 text-xs tabular-nums text-on-ghost-subtle ml-auto"
                    >
                      {{ formatDuration(step.duration_ms) }}
                    </span>
                    <span
                      v-else-if="idx === liveSteps.length - 1"
                      class="inline-block size-1.25 rounded-full bg-current opacity-80 animate-live-pulse ml-auto shrink-0"
                    ></span>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Current status row -->
            <div class="flex items-center gap-2">
              <ChatLogo size="md" :loading="true" variant="gradient" />
              <span class="text-base text-on-ghost-muted">{{
                isSearching
                  ? t('chat.status.connecting') + dots
                  : t(
                      `chat.status.${chat?.currentAiStatus || (chat?.isOpponentTyping ? 'generating' : 'thinking')}`,
                    ) + dots
              }}</span>
            </div>
          </div>
        </div>
        <div
          key="dynamic-spacer"
          class="chat-spacer shrink-0 w-full pointer-events-none"
          :style="{
            height: dynamicSpacerHeight + 'px',
            transition: 'height 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
          }"
        ></div>
      </TransitionGroup>
    </main>

    <div class="w-full relative shrink-0 z-10 flex flex-col items-center pb-2">
      <div
        class="absolute bottom-full left-0 w-full h-16 bg-linear-to-t from-background to-transparent pointer-events-none transition-opacity duration-500"
        :class="displayMessages.length === 0 ? 'opacity-0' : 'opacity-100'"
      ></div>
      <div
        class="absolute inset-0 w-full h-full bg-background pointer-events-none transition-opacity duration-500"
        :class="displayMessages.length === 0 ? 'opacity-0' : 'opacity-100'"
      ></div>

      <div
        class="w-full max-w-200 px-4 pointer-events-auto relative transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
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
            <div class="text-4xl font-normal text-on-ghost">
              Tired of talking to <b>artificial</b> intelligence?
            </div>
          </div>
        </Transition>

        <form @submit.prevent="send" novalidate class="relative w-full z-20">
          <div
            class="p-3 rounded-4xl flex flex-col gap-2 bg-surface border border-surface-border w-full shadow-sm"
          >
            <textarea
              id="user-input"
              ref="textareaRef"
              v-model="userInput"
              @input="autoResize"
              @keydown.enter.exact.prevent="send"
              rows="1"
              placeholder="Ask Natural Intelligence"
              class="w-full py-2 px-3 bg-transparent rounded-none border-none outline-none shadow-none text-on-ghost text-base/6 placeholder:text-on-ghost-subtle resize-none overflow-y-auto max-h-60 block box-border m-0 custom-scrollbar"
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
                >
                  <BaseButton
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
              class="text-xs text-center text-on-ghost-subtle m-4 mb-2"
            >
              Natural Intelligence makes mistakes. Don't share personal data
            </div>
            <BaseRow v-else>
              <BaseButton
                key="button"
                type="button"
                variant="ghost"
                class="mt-4"
                @click="router.push('/natural-intelligence')"
              >
                Learn more
              </BaseButton>
              <BaseButton
                key="button"
                type="button"
                variant="action"
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

/* ─── Step History ──────────────────────────────────────────────────────── */

.animate-live-pulse {
  animation: live-pulse 1s ease-in-out infinite;
}

@keyframes live-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
</style>
