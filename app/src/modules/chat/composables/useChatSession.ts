import { ref, readonly, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/modules/chat/composables/useAuth';

export interface ChatMessage {
  id: string;
  created_at: string;
  session_id: string;
  sender_id: string;
  content: string;
}

export function useChatSession(sessionId: string) {
  const { user } = useAuth();

  const messages = ref<ChatMessage[]>([]);
  const isOpponentTyping = ref(false);
  const isOpponentConnected = ref(true);
  const chatError = ref<string | null>(null);

  let chatChannel: RealtimeChannel | null = null;
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;

  const initializeChat = async () => {
    if (!sessionId || !user.value) return;

    chatError.value = null;
    messages.value = [];

    // Fetch historical messages (in case of a brief reconnect)
    const { data: initialMessages, error: fetchErr } = await supabase
      .from('intelligence_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!fetchErr && initialMessages) {
      messages.value = initialMessages;
    }

    // Setup the master channel for this session
    chatChannel = supabase.channel(`chat_${sessionId}`, {
      config: { presence: { key: user.value.id } },
    });

    chatChannel
      // 1. Listen for new messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intelligence_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          messages.value.push(payload.new as ChatMessage);
        },
      )
      // 2. Listen for Typing Indicators (via fast Broadcast)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.userId !== user.value?.id) {
          isOpponentTyping.value = payload.isTyping;
        }
      })
      // 3. Track Presence (Detect if the opponent closes the tab/disconnects)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = chatChannel?.presenceState() || {};
        // If there is only 1 person in the presence state, the opponent left
        isOpponentConnected.value = Object.keys(presenceState).length > 1;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await chatChannel?.track({ online_at: new Date().toISOString() });
        }
      });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user.value) return;

    // Note: We don't push to messages.value here.
    // We let the postgres_changes listener handle it so we guarantee exact DB order.
    const { error } = await supabase.from('intelligence_messages').insert({
      session_id: sessionId,
      sender_id: user.value.id,
      content: content.trim(),
    });

    if (error) chatError.value = 'Failed to send message.';

    // Stop typing indicator instantly on send
    setTyping(false);
  };

  const setTyping = async (isTyping: boolean) => {
    if (!chatChannel || !user.value) return;

    // Debounce to prevent spamming the WebSocket
    if (typingTimeout) clearTimeout(typingTimeout);

    await chatChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.value.id, isTyping },
    });

    // Auto-disable typing indicator after 3 seconds of no keyboard input
    if (isTyping) {
      typingTimeout = setTimeout(() => setTyping(false), 3000);
    }
  };

  const leaveChat = async () => {
    if (chatChannel) {
      await supabase.removeChannel(chatChannel);
      chatChannel = null;
    }

    // Optionally update the session status to 'ended' in the DB here
    await supabase
      .from('intelligence_sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId);
  };

  // Absolute guarantee against memory/connection leaks
  onUnmounted(() => {
    if (typingTimeout) clearTimeout(typingTimeout);
    if (chatChannel) supabase.removeChannel(chatChannel);
  });

  return {
    messages: readonly(messages),
    isOpponentTyping: readonly(isOpponentTyping),
    isOpponentConnected: readonly(isOpponentConnected),
    error: readonly(chatError),
    initializeChat,
    sendMessage,
    setTyping,
    leaveChat,
  };
}
