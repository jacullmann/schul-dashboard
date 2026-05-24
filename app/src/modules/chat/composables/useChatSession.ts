import { ref } from 'vue';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

export interface ChatMessage {
  id: string;
  created_at: string;
  session_id: string;
  sender_id: string;
  content: string;
  metadata?: {
    model?: string;
    steps?: AiStep[];
    [key: string]: any;
  };
}

export interface AiStep {
  status: string;
  tool?: string;
  duration_ms?: number;
  timestamp: number;
}

export function useChatSession(sessionId: string) {
  const { user } = useAuth();

  const messages = ref<ChatMessage[]>([]);
  const isOpponentTyping = ref(false);
  const currentAiStatus = ref<string | null>(null);
  const isOpponentConnected = ref(true);
  const chatError = ref<string | null>(null);

  const aiSteps = ref<AiStep[]>([]);
  let stepStartTime: number | null = null;

  let chatChannel: RealtimeChannel | null = null;
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let hasOpponentJoinedOnce = false;
  let isSubscribed = false;

  const initializeChat = async () => {
    if (!sessionId || !user.value) return;

    chatError.value = null;
    messages.value = [];
    isOpponentConnected.value = true;
    currentAiStatus.value = null;
    aiSteps.value = [];
    hasOpponentJoinedOnce = false;
    isSubscribed = false;

    chatChannel = supabase.channel(`chat_${sessionId}`, {
      config: { presence: { key: user.value.id } },
    });

    chatChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.sender_id !== user.value?.id) {
            if (!messages.value.find((m) => m.id === newMessage.id)) {
              messages.value.push(newMessage);
              messages.value.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              );
            }
          }
        },
      )
      .on('broadcast', { event: 'message' }, (payload) => {
        const newMessage = payload.payload as ChatMessage;
        if (newMessage.sender_id !== user.value?.id) {
          if (!messages.value.find((m) => m.id === newMessage.id)) {
            messages.value.push(newMessage);
            messages.value.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          }
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== user.value?.id) {
          isOpponentTyping.value = payload.payload.isTyping;
        }
      })
      .on('broadcast', { event: 'ai_status' }, (payload) => {
        if (payload.payload.userId !== user.value?.id) {
          const newStatus: string | null = payload.payload.status;
          currentAiStatus.value = newStatus;

          if (newStatus) {
            const lastReceivedStep = aiSteps.value[aiSteps.value.length - 1];
            const isDuplicate =
              lastReceivedStep &&
              lastReceivedStep.status === newStatus &&
              lastReceivedStep.tool === payload.payload.tool;

            if (!isDuplicate) {
              if (lastReceivedStep && stepStartTime !== null) {
                lastReceivedStep.duration_ms = Date.now() - stepStartTime;
              }
              stepStartTime = Date.now();
              aiSteps.value.push({
                status: newStatus,
                tool: payload.payload.tool,
                timestamp: stepStartTime,
              });
            }
          } else {
            const lastReceivedStep = aiSteps.value[aiSteps.value.length - 1];
            if (lastReceivedStep && stepStartTime !== null) {
              lastReceivedStep.duration_ms = Date.now() - stepStartTime;
            }
            stepStartTime = null;
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = chatChannel?.presenceState() || {};
        const isConnected = Object.keys(presenceState).length > 1;

        if (isConnected) hasOpponentJoinedOnce = true;

        if (hasOpponentJoinedOnce) {
          isOpponentConnected.value = isConnected;
        }
      });

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        data.forEach((dbMsg) => {
          if (!messages.value.find((m) => m.id === dbMsg.id)) {
            messages.value.push(dbMsg);
          }
        });
        messages.value.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }
    };

    await fetchHistory();

    await new Promise<void>((resolve) => {
      chatChannel!.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          await chatChannel?.track({ online_at: new Date().toISOString() });

          await fetchHistory();
          resolve();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.error(`Channel subscription failed: ${status}`, err);
          isSubscribed = false;
          resolve();
        }
      });
    });
  };

  const setAiStatus = async (status: string | null, tool?: string) => {
    if (!chatChannel || !user.value || !isSubscribed) return;

    const lastStep = aiSteps.value[aiSteps.value.length - 1];
    const isDuplicate =
      lastStep && lastStep.status === status && lastStep.tool === tool;

    if (lastStep && stepStartTime !== null && !isDuplicate) {
      lastStep.duration_ms = Date.now() - stepStartTime;
    }

    if (status && !isDuplicate) {
      stepStartTime = Date.now();
      aiSteps.value.push({
        status,
        tool,
        timestamp: stepStartTime,
      });
    } else if (!status) {
      stepStartTime = null;
    }

    await chatChannel
      .send({
        type: 'broadcast',
        event: 'ai_status',
        payload: { userId: user.value.id, status, tool },
      })
      .catch((err) => console.warn('AI status broadcast failed:', err));
  };

  const sendMessage = async (
    content: string,
    metadata?: Record<string, any>,
  ) => {
    if (!content.trim() || !user.value) return;

    const lastStep = aiSteps.value[aiSteps.value.length - 1];
    if (lastStep && stepStartTime !== null) {
      lastStep.duration_ms = Date.now() - stepStartTime;
      stepStartTime = null;
    }

    const messageId = crypto.randomUUID();
    const finalMetadata = {
      ...metadata,
      steps: aiSteps.value.length > 0 ? [...aiSteps.value] : undefined,
    };

    const optimisticMessage: ChatMessage = {
      id: messageId,
      created_at: new Date().toISOString(),
      session_id: sessionId,
      sender_id: user.value.id,
      content: content.trim(),
      metadata: finalMetadata,
    };
    messages.value.push(optimisticMessage);

    setTyping(false);
    setAiStatus(null);
    aiSteps.value = [];

    const { error } = await supabase.from('messages').insert({
      id: messageId,
      session_id: sessionId,
      sender_id: user.value.id,
      content: content.trim(),
      metadata: finalMetadata,
    });

    if (error) {
      chatError.value = 'Failed to send message.';
      console.error(error);
      return;
    }

    if (chatChannel && isSubscribed) {
      chatChannel
        .send({
          type: 'broadcast',
          event: 'message',
          payload: optimisticMessage,
        })
        .catch((err) => console.warn('Message broadcast failed:', err));
    }
  };

  const setTyping = async (isTyping: boolean) => {
    if (!chatChannel || !user.value || !isSubscribed) return;

    if (typingTimeout) clearTimeout(typingTimeout);

    await chatChannel
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.value.id, isTyping },
      })
      .catch((err) => console.warn('Typing broadcast failed:', err));

    if (isTyping) {
      typingTimeout = setTimeout(() => setTyping(false), 3000);
    }
  };

  const leaveChat = async () => {
    destroy();
    await supabase
      .from('sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId);
  };

  const destroy = () => {
    if (typingTimeout) clearTimeout(typingTimeout);
    if (chatChannel) {
      supabase.removeChannel(chatChannel);
      chatChannel = null;
    }
  };

  return {
    messages,
    isOpponentTyping,
    currentAiStatus,
    aiSteps,
    isOpponentConnected,
    error: chatError,
    initializeChat,
    sendMessage,
    setAiStatus,
    setTyping,
    leaveChat,
    destroy,
  };
}
