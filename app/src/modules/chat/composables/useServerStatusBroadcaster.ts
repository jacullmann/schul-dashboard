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

// Interface to match the useChatSession return type
interface ChatSessionInterface {
  setAiStatus: (status: string | null, tool?: string) => Promise<void>;
  setTyping: (isTyping: boolean) => Promise<void>;
}

/** How long (ms) after the last keystroke before "generating" reverts to the previous status. */
const GENERATING_DEBOUNCE_MS = 600;

export function useServerStatusBroadcaster(
  chat: Ref<ChatSessionInterface | null>,
  states: ToolStates,
) {
  /** True only while the user is actively typing (debounced). */
  const isActivelyTyping = ref(false);
  let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Watch keystrokes: flip the flag on, then schedule it off after the debounce window.
  watch(
    () => states.userInput.value,
    (newVal, oldVal) => {
      // Only treat it as active typing when the value actually changed (not on external resets).
      if (newVal === oldVal) return;

      // Trigger the broadcast typing indicator on every real keystroke.
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
    // "generating" only fires while the user is actively typing, not just because
    // text happens to be present in the textarea.
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
