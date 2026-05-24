import { watch, computed, ref, type Ref } from 'vue';

export type AiStatusKey =
  | 'thinking'
  | 'generating'
  | 'searching'
  | 'creating_image'
  | 'pondering'
  | 'executing_terminal';

interface ToolStates {
  webSearch: Ref<boolean>;
  createImage: Ref<boolean>;
  reasoning: Ref<boolean>;
  terminal: Ref<boolean>;
  userInput: Ref<string>;
}

interface ChatSessionInterface {
  setAiStatus: (status: string | null, tool?: string) => Promise<void>;
  setTyping: (isTyping: boolean) => Promise<void>;
}

const GENERATING_DEBOUNCE_MS = 600;

export function useServerStatusBroadcaster(
  chat: Ref<ChatSessionInterface | null>,
  states: ToolStates,
) {

  const isActivelyTyping = ref(false);
  let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => states.userInput.value,
    (newVal, oldVal) => {

      if (newVal === oldVal) return;

      if (chat.value && newVal.trim().length > 0) {
        chat.value.setTyping(true);
      }

      isActivelyTyping.value = true;

      if (typingDebounceTimer !== null) clearTimeout(typingDebounceTimer);
      typingDebounceTimer = setTimeout(() => {
        isActivelyTyping.value = false;
        typingDebounceTimer = null;
      }, GENERATING_DEBOUNCE_MS);
    },
  );

  const currentStatus = computed<{ key: AiStatusKey; tool?: string }>(() => {

    if (isActivelyTyping.value) return { key: 'generating' };
    if (states.webSearch.value) return { key: 'searching', tool: 'web_search' };
    if (states.createImage.value)
      return { key: 'creating_image', tool: 'image_generation' };
    if (states.reasoning.value) return { key: 'pondering', tool: 'ponder' };
    if (states.terminal.value)
      return { key: 'executing_terminal', tool: 'terminal' };
    return { key: 'thinking' };
  });

  watch(
    [currentStatus, () => chat.value] as const,
    ([newStatus, currentChat]) => {
      if (currentChat) {
        currentChat.setAiStatus(newStatus.key, newStatus.tool);
      }
    },
    { immediate: true },
  );

  return {
    currentStatus,
  };
}
