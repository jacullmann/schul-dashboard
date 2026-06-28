<script setup lang="ts">
/* eslint-disable vue/one-component-per-file */
import {
  computed,
  nextTick,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
  h,
  defineComponent,
  onBeforeUnmount,
  type VNode,
} from 'vue';
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
  Settings,
} from '@lucide/vue';
import ChatLogo from '@/modules/chat/components/ChatLogo.vue';
import ModelSelect from '@/modules/chat/components/ModelSelect.vue';
import ChatToolSelect from '@/modules/chat/components/ChatToolSelect.vue';
import FileMenu from '@/modules/chat/components/FileMenu.vue';
import { useToast } from '@/common/composables/useToast';
import { useClipboard, useWindowSize, useResizeObserver } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAnimatedEllipsis } from '@/modules/chat/composables/useAnimatedEllipsis';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import BaseLink from '@/common/components/BaseLink.vue';
import ChatImage from '@/modules/chat/components/ChatImage.vue';

const { copy } = useClipboard();
const router = useRouter();
const windowWidth = useWindowSize().width;
const { t, locale } = useI18n();
const dots = useAnimatedEllipsis();
const toast = useToast();

// State
const userInput = ref('');
const selectedModel = ref('instant');
const isThinking = ref(false);
const isSearching = ref(false);
const currentAiStatus = ref<string | null>(null);

const webSearch = ref(false);
const createImage = ref(false);
const ponder = ref(false);
const answerLeisurely = ref(false);

// API Key Management
const isApiKeyModalOpen = ref(false);
const apiKey = ref(localStorage.getItem('gemini_api_key') || '');
const apiKeyValue = ref(apiKey.value);

watch(isApiKeyModalOpen, (isOpen) => {
  if (isOpen) {
    apiKeyValue.value = apiKey.value;
  }
});

function getApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  return apiKey.value;
}

const hasApiKey = computed(() => !!getApiKey());

function saveApiKey() {
  const cleanKey = apiKeyValue.value.trim();
  apiKey.value = cleanKey;
  if (cleanKey) {
    localStorage.setItem('gemini_api_key', cleanKey);
    toast.success('API Key saved successfully.');
    isApiKeyModalOpen.value = false;
  } else {
    localStorage.removeItem('gemini_api_key');
    toast.info('API Key removed.');
    isApiKeyModalOpen.value = false;
  }
}

// Message schema
interface UIMessage {
  id: string;
  role: 'human' | 'assistant';
  content: string;
  steps?: AiStep[];
  sources?: { title: string; url: string }[];
}

interface AiStep {
  status: string;
  tool?: string;
  duration_ms?: number;
  timestamp: number;
}

const displayMessages = ref<UIMessage[]>([]);
const liveSteps = ref<AiStep[]>([]);
const isStepHistoryExpanded = ref(false);
const expandedMessageSteps = ref<Record<string, boolean>>({});
const overflowingHumanMessages = ref<Record<string, boolean>>({});
const expandedHumanMessages = ref<Record<string, boolean>>({});

// Steps logic
function addLiveStep(status: string, tool?: string) {
  const now = Date.now();
  if (liveSteps.value.length > 0) {
    const lastStep = liveSteps.value[liveSteps.value.length - 1];
    if (!lastStep.duration_ms) {
      lastStep.duration_ms = now - lastStep.timestamp;
    }
  }

  // Prevent duplicates
  const isDuplicate = liveSteps.value.some(
    (s) => s.status === status && s.tool === tool,
  );
  if (!isDuplicate) {
    liveSteps.value.push({
      status,
      tool,
      timestamp: now,
    });
  }
  currentAiStatus.value = status;
}

function finishLiveSteps() {
  const now = Date.now();
  if (liveSteps.value.length > 0) {
    const lastStep = liveSteps.value[liveSteps.value.length - 1];
    if (!lastStep.duration_ms) {
      lastStep.duration_ms = now - lastStep.timestamp;
    }
  }
  currentAiStatus.value = null;
}

// Request cancellation
let abortController: AbortController | null = null;

const handleCancel = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isThinking.value = false;
  isSearching.value = false;
  finishLiveSteps();

  // Clean up any empty assistant message at the end
  if (displayMessages.value.length > 0) {
    const lastMsg = displayMessages.value[displayMessages.value.length - 1];
    if (lastMsg.role === 'assistant' && !lastMsg.content) {
      displayMessages.value.pop();
    }
  }
  toast.info('Generation cancelled.');
};

// Stream call implementation
async function callGeminiStream(userPrompt: string, aiMessage: UIMessage) {
  abortController = new AbortController();

  const contents = [];
  const maxHistory = 15;
  const recentMessages = displayMessages.value.slice(-maxHistory);

  for (const msg of recentMessages) {
    if (msg.id === aiMessage.id) continue;
    contents.push({
      role: msg.role === 'human' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });
  }

  const modelName =
    selectedModel.value === 'instant'
      ? 'gemini-3.1-flash-lite'
      : 'gemini-3.5-flash';
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const tools: any[] = [];
  if (webSearch.value) {
    tools.push({ google_search: {} });
    isSearching.value = true;
    addLiveStep('searching', 'web_search');
  } else {
    addLiveStep('thinking');
  }

  const generationConfig: Record<string, any> = {
    thinkingConfig: {
      thinkingLevel: ponder.value ? 'HIGH' : 'LOW',
    },
  };
  if (ponder.value) {
    addLiveStep('pondering');
  }

  let systemInstruction: any = undefined;
  if (createImage.value) {
    systemInstruction = {
      parts: [
        {
          text: 'You have an image generation engine at your disposal. If the user asks you to create, generate, draw, or show an image, you must output a markdown link of the form `![{image_description}](https://image.pollinations.ai/prompt/{image-prompt})` (or a standard link `[image](https://image.pollinations.ai/prompt/{image-prompt})`) with the prompt formatted as a URL (URL-encoded string). Treat this as your image generation engine.',
        },
      ],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      tools: tools.length > 0 ? tools : undefined,
      generationConfig:
        Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
      systemInstruction: systemInstruction,
    }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message ||
        `API request failed with status ${response.status}`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  isSearching.value = false;
  addLiveStep('generating');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const parts = parsed.candidates?.[0]?.content?.parts;

          if (parts) {
            for (const part of parts) {
              if (part.text) {
                aiMessage.content += part.text;
                void nextTick(() => scrollToBottom());
              }
            }
          }

          // Handle search grounding citations
          const groundingMetadata = parsed.candidates?.[0]?.groundingMetadata;
          if (groundingMetadata) {
            const chunks = groundingMetadata.groundingChunks;
            if (chunks && chunks.length > 0) {
              const sources = chunks.map((chunk: any) => ({
                title: chunk.web?.title || chunk.web?.uri || 'Source',
                url: chunk.web?.uri || '#',
              }));

              if (!aiMessage.sources) {
                aiMessage.sources = [];
              }

              for (const src of sources) {
                if (!aiMessage.sources.find((s) => s.url === src.url)) {
                  aiMessage.sources.push(src);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse SSE JSON:', e);
        }
      }
    }
  }

  finishLiveSteps();
  abortController = null;
}

async function send() {
  if (isThinking.value) return;
  const content = userInput.value.trim();
  if (!content) return;

  if (!hasApiKey.value) {
    isApiKeyModalOpen.value = true;
    toast.info('Please enter your Gemini API Key first.');
    return;
  }

  // Reset steps
  liveSteps.value = [];
  isStepHistoryExpanded.value = true;

  // Add user message
  displayMessages.value.push({
    id: crypto.randomUUID(),
    role: 'human',
    content,
  });

  userInput.value = '';
  void autoResize();
  void nextTick(() => scrollToBottom());

  const aiMsgId = crypto.randomUUID();
  const aiMessage: UIMessage = {
    id: aiMsgId,
    role: 'assistant',
    content: '',
    steps: [],
  };
  displayMessages.value.push(aiMessage);

  isThinking.value = true;

  try {
    await callGeminiStream(content, aiMessage);
    aiMessage.steps = [...liveSteps.value];
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Gemini API Error:', err);
      aiMessage.content = `Error: ${err.message || 'Failed to generate response'}`;
      toast.error('Failed to communicate with Gemini API.');
    }
  } finally {
    isThinking.value = false;
  }
}

// UI helper methods (copied from ChatView)
const isLockedIn = computed(() => isThinking.value);

const handleModelChangeRequest = (newModel: string) => {
  clearChat();
  selectedModel.value = newModel;
  toast.info(`Switched to ${newModel} model. Started a new chat.`);
};

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

const autoResize = async () => {
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

const onInput = (e: Event) => {
  userInput.value = (e.target as HTMLTextAreaElement).value;
  void autoResize();
};

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth',
    });
  }
};

watch(userInput, () => {
  void autoResize();
});

watch(
  () => displayMessages.value.length,
  () => {
    void nextTick(() => {
      calculateSpacer();
      scrollToBottom();
    });
  },
);

function clearChat() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  displayMessages.value = [];
  liveSteps.value = [];
  userInput.value = '';
  isThinking.value = false;
  isSearching.value = false;
}

function handleReport(_message: UIMessage, _reason: string) {
  toast.success('Thank you for your feedback! Flagged this message.');
}

const isListening = ref(false);
let recognition: any = null;

onBeforeUnmount(() => {
  if (recognition && isListening.value) {
    recognition.stop();
  }
});

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
  recognition.lang = locale.value.startsWith('de') ? 'de-DE' : 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening.value = true;
  };

  recognition.onresult = (event: any) => {
    userInput.value = Array.from(event.results)
      .map((result: any) => result[0])
      .map((result) => result.transcript)
      .join('');
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

function toggleMessageSteps(messageId: string) {
  expandedMessageSteps.value[messageId] =
    !expandedMessageSteps.value[messageId];
}

function isMessageStepsExpanded(messageId: string) {
  return !!expandedMessageSteps.value[messageId];
}

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

function getStepLabel(step: AiStep): string {
  const base = t(`chat.status.${step.status}`, step.status);
  return step.tool ? `${base}` : base;
}

function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const TableWrapper = defineComponent({
  name: 'TableWrapper',
  setup(props, { slots }) {
    const wrapperRef = ref<HTMLElement | null>(null);
    const showLeftFade = ref(false);
    const showRightFade = ref(false);

    const updateFade = () => {
      const el = wrapperRef.value;
      if (!el) return;
      showLeftFade.value = el.scrollLeft > 1;
      showRightFade.value = el.scrollWidth - el.scrollLeft - el.clientWidth > 1;
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateFade();
          ticking = false;
        });
        ticking = true;
      }
    };

    const maskStyle = computed(() => {
      const left = showLeftFade.value;
      const right = showRightFade.value;

      let mask = 'none';
      if (left && right) {
        mask =
          'linear-gradient(to right, transparent 0px, black 32px, black calc(100% - 32px), transparent 100%)';
      } else if (left) {
        mask = 'linear-gradient(to right, transparent 0px, black 32px)';
      } else if (right) {
        mask = 'linear-gradient(to left, transparent 0px, black 32px)';
      }
      return {
        webkitMaskImage: mask,
        maskImage: mask,
      };
    });

    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      updateFade();
      window.addEventListener('resize', updateFade);

      const el = wrapperRef.value;
      if (el) {
        resizeObserver = new ResizeObserver(() => {
          updateFade();
        });
        resizeObserver.observe(el);
        for (const child of el.children) {
          resizeObserver.observe(child);
        }
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', updateFade);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });

    return () =>
      h(
        'div',
        {
          ref: wrapperRef,
          class:
            'overflow-x-auto my-3! transition-all duration-300 scrollbar-hide',
          style: maskStyle.value,
          onScroll: handleScroll,
        },
        slots.default?.(),
      );
  },
});
function isImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('https://image.pollinations.ai/prompt/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)(?:\?.*)?$/i.test(url);
}

function renderToken(token: any): VNode | string {
  switch (token.type) {
    case 'heading':
      return h(`h${token.depth}`, {}, renderTokens(token.tokens));
    case 'paragraph':
      return h('p', {}, renderTokens(token.tokens));
    case 'text':
      return token.tokens
        ? h('span', {}, renderTokens(token.tokens))
        : token.text;
    case 'strong':
      return h('strong', {}, renderTokens(token.tokens));
    case 'em':
      return h('em', {}, renderTokens(token.tokens));
    case 'codespan':
      return h(
        'code',
        {
          class: 'bg-ghost-hover text-on-ghost px-2 py-0.5 rounded-md text-sm',
        },
        token.text,
      );
    case 'code':
      return h(
        'pre',
        {
          class:
            'bg-ghost-hover text-on-ghost px-6 py-5 rounded-2xl overflow-x-auto my-3',
        },
        [h('code', { class: 'bg-transparent p-0' }, token.text)],
      );
    case 'blockquote':
      return h(
        'blockquote',
        { class: 'border-l-4 border-ghost-border pl-4 italic my-3' },
        renderTokens(token.tokens),
      );
    case 'list':
      return h(
        token.ordered ? 'ol' : 'ul',
        {
          class: token.ordered
            ? 'list-decimal pl-5 my-2'
            : 'list-disc pl-5 my-2',
        },
        [
          ...token.items.map((item: any) =>
            h('li', { class: 'mb-1' }, renderTokens(item.tokens)),
          ),
        ],
      );
    case 'list_item':
      return h('li', { class: 'mb-1' }, renderTokens(token.tokens));
    case 'link':
      if (isImageUrl(token.href)) {
        return h(ChatImage, {
          src: token.href,
          alt: token.text || 'Image',
        });
      }
      return h(BaseLink, { to: token.href }, () => renderTokens(token.tokens));
    case 'image':
      return h(ChatImage, {
        src: token.href,
        alt: token.text || 'Image',
        title: token.title || undefined,
      });
    case 'br':
      return h('br');
    case 'space':
      return '';
    case 'escape':
      return token.text;
    case 'html':
      return h('span', { innerHTML: DOMPurify.sanitize(token.text) });
    case 'table': {
      const headerRow = h(
        'tr',
        {},
        token.header.map((cell: any, index: number) => {
          const align = token.align[index];
          return h(
            'th',
            { style: align ? { textAlign: align } : undefined },
            renderTokens(cell.tokens),
          );
        }),
      );
      const bodyRows = token.rows.map((row: any[]) => {
        return h(
          'tr',
          {},
          row.map((cell: any, index: number) => {
            const align = token.align[index];
            return h(
              'td',
              { style: align ? { textAlign: align } : undefined },
              renderTokens(cell.tokens),
            );
          }),
        );
      });
      return h(TableWrapper, {}, () =>
        h('table', {}, [h('thead', {}, [headerRow]), h('tbody', {}, bodyRows)]),
      );
    }

    default:
      return token.text || '';
  }
}

function renderTokens(tokensList: any[] | undefined): (VNode | string)[] {
  if (!tokensList) return [];
  return tokensList.map(renderToken);
}

const MarkdownRenderer = defineComponent({
  name: 'MarkdownRenderer',
  props: {
    tokens: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    return () => renderTokens(props.tokens as any[]);
  },
});
</script>

<template>
  <div class="h-dvh w-full flex flex-col overflow-hidden bg-canvas">
    <div
      class="absolute top-2 left-2 bg-surface border border-ghost-border z-1 rounded-full p-1 flex gap-1"
    >
      <BaseTooltip content="New Chat" placement="bottom">
        <BaseButton
          variant="ghost"
          class="z-10"
          :icon="SquarePen"
          @click="clearChat"
        />
      </BaseTooltip>
      <BaseTooltip content="Gemini API Key" placement="bottom">
        <BaseButton
          variant="ghost"
          class="z-10"
          :icon="Settings"
          :class="{ 'text-danger!': !hasApiKey }"
          @click="isApiKeyModalOpen = true"
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
              :aria-expanded="isMessageStepsExpanded(message.id)"
              :icon="
                isMessageStepsExpanded(message.id) ? ChevronDown : ChevronRight
              "
              @click="toggleMessageSteps(message.id)"
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
                class="flex flex-col gap-1 py-1 pl-4 border-l-[1.5px] border-ghost-border ml-5.5"
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
          <div
            v-if="message.role === 'human'"
            class="flex flex-col items-end max-w-[75%] mb-2"
          >
            <div
              class="bg-surface border border-ghost-border flex px-4 rounded-2xl wrap-break-word text-left relative overflow-hidden transition-all duration-300"
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
              <div
                v-if="
                  !expandedHumanMessages[message.id] &&
                  overflowingHumanMessages[message.id]
                "
                class="absolute bottom-0 left-0 w-full h-8 bg-linear-to-t from-surface to-transparent pointer-events-none z-10"
              ></div>
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
            <div
              class="min-h-0 overflow-hidden whitespace-normal [&_p]:mt-0! [&_p]:mb-2! [&_p]:text-on-ghost! [&_p]:whitespace-pre-wrap! [&_p:last-child]:mb-0! [&_ul]:mt-0! [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2! [&_ol]:mt-0! [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2! [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-on-ghost [&_h1]:mt-0! [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:mt-0! [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:mt-0! [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-1 inline-block w-full align-top"
            >
              <MarkdownRenderer :tokens="marked.lexer(message.content)" />
            </div>

            <!-- Search Grounding Citations -->
            <div
              v-if="message.sources && message.sources.length > 0"
              class="mt-4 pt-2 border-t border-ghost-border/40 text-xs text-on-ghost-muted"
            >
              <span class="font-semibold block mb-1">Sources:</span>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="(source, sIdx) in message.sources"
                  :key="sIdx"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="bg-surface hover:bg-surface-hover border border-ghost-border px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-colors text-on-ghost"
                >
                  <Globe :size="10" />
                  <span>{{ source.title }}</span>
                </a>
              </div>
            </div>

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
                    toast.success('Copied to clipboard'))
                  "
                />
              </BaseTooltip>
            </BaseRow>
          </div>
        </div>
        <div v-if="isThinking" key="thinking" class="flex justify-start w-full">
          <div class="flex flex-col gap-2 py-2 px-2 w-full">
            <div class="flex flex-col gap-0 mb-1">
              <BaseButton
                :class="{
                  'cursor-default! opacity-50! hover:bg-transparent! hover:text-on-ghost-subtle!':
                    liveSteps.length === 0,
                }"
                :disabled="liveSteps.length === 0"
                :aria-expanded="isStepHistoryExpanded"
                :aria-disabled="liveSteps.length === 0"
                :icon="isStepHistoryExpanded ? ChevronDown : ChevronRight"
                variant="ghost"
                @click="
                  liveSteps.length > 0 &&
                  (isStepHistoryExpanded = !isStepHistoryExpanded)
                "
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
                  class="flex flex-col gap-1 py-1 pl-4 border-l-[1.5px] border-ghost-border ml-5.5"
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

            <div class="flex items-center gap-2">
              <ChatLogo size="md" :loading="true" variant="gradient" />
              <span class="text-base text-on-ghost-muted">
                {{
                  isSearching
                    ? t('chat.status.connecting', 'Searching') + dots
                    : t(
                        `chat.status.${currentAiStatus || 'thinking'}`,
                        currentAiStatus || 'Thinking',
                      ) + dots
                }}
              </span>
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
              Have a conversation with <b>Gemini</b> AI
            </div>
          </div>
        </Transition>

        <form novalidate class="relative w-full z-20" @submit.prevent="send">
          <div
            class="p-3 rounded-3xl flex flex-col gap-2 bg-surface border border-ghost-border w-full shadow-sm"
          >
            <textarea
              id="user-input"
              ref="textareaRef"
              :value="userInput"
              rows="1"
              placeholder="Ask Gemini..."
              class="w-full py-2 px-3 bg-transparent rounded-none border-none outline-none shadow-none text-on-ghost text-base/6 placeholder:text-on-ghost-subtle resize-none overflow-y-auto max-h-60 block box-border m-0 custom-scrollbar"
              @input="onInput"
              @keydown.enter.exact.prevent="send"
            ></textarea>

            <BaseRow justify="between">
              <BaseRow>
                <FileMenu />
                <ChatToolSelect
                  v-model:web-search="webSearch"
                  v-model:create-image="createImage"
                  v-model:ponder="ponder"
                  v-model:answer-leisurely="answerLeisurely"
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
                  :is-locked="isLockedIn"
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
                    v-else-if="!userInput || isListening"
                    key="voice"
                    content="Use voice"
                    placement="bottom"
                  >
                    <BaseButton
                      :icon="AudioLines"
                      :variant="isListening ? 'action' : 'ghost'"
                      @click="toggleSpeechRecognition"
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
                      @click.prevent="send"
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
              Gemini makes mistakes. Don't share personal data.
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
            </BaseRow>
          </Transition>
        </div>
      </div>
    </div>

    <!-- API Key Config Modal -->
    <BaseModal
      :open="isApiKeyModalOpen"
      :submit="saveApiKey"
      @cancel="isApiKeyModalOpen = false"
    >
      <template #title>Gemini API Key</template>
      <template #content>
        <div class="flex flex-col gap-4 py-2">
          <p class="text-sm text-on-ghost-muted">
            Please enter your Gemini API Key. This key is only saved locally in
            your browser's LocalStorage and is sent directly to Gemini servers.
          </p>
          <BaseInput
            id="gemini-api-key"
            v-model="apiKeyValue"
            type="password"
            placeholder="AIzaSy..."
            required
          />
        </div>
      </template>
    </BaseModal>
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
