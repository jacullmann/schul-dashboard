import { watch, computed, type Ref } from 'vue';

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

export function useServerStatusBroadcaster(
  chat: Ref<ChatSessionInterface | null>,
  states: ToolStates,
) {
  const currentStatus = computed<{ key: AiStatusKey; tool?: string }>(() => {
    if (states.userInput.value.trim().length > 0) return { key: 'generating' };
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

  // Trigger typing indicator on every keystroke when generating
  watch(
    () => states.userInput.value,
    (newVal) => {
      if (chat.value && newVal.trim().length > 0) {
        chat.value.setTyping(true);
      }
    },
  );

  return {
    currentStatus,
  };
}
