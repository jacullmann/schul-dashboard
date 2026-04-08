import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from './useAuth'

export interface ChatMessage {
  id: string
  created_at: string
  session_id: string
  sender_id: string
  content: string
}

export function useChatSession(sessionId: string) {
  const { user } = useAuth()

  const messages = ref<ChatMessage[]>([])
  const isOpponentTyping = ref(false)
  const isOpponentConnected = ref(true)
  const chatError = ref<string | null>(null)

  let chatChannel: RealtimeChannel | null = null
  let typingTimeout: ReturnType<typeof setTimeout> | null = null
  let hasOpponentJoinedOnce = false;
  let isSubscribed = false;

  const initializeChat = async () => {
    if (!sessionId || !user.value) return

    chatError.value = null
    messages.value = []
    isOpponentConnected.value = true
    hasOpponentJoinedOnce = false
    isSubscribed = false;

    // 1. Fetch historical messages
    const { data: initialMessages, error: fetchErr } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

    if (!fetchErr && initialMessages) {
      messages.value = initialMessages
    }

    // 2. Setup the master channel
    chatChannel = supabase.channel(`chat_${sessionId}`, {
      config: { presence: { key: user.value.id } }
    })

    chatChannel
        .on('broadcast', { event: 'message' }, (payload) => {
          const newMessage = payload.payload as ChatMessage
          if (newMessage.sender_id !== user.value?.id) {
            if (!messages.value.find(m => m.id === newMessage.id)) {
              messages.value.push(newMessage)
              messages.value.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            }
          }
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.userId !== user.value?.id) {
            isOpponentTyping.value = payload.payload.isTyping
          }
        })
        .on('presence', { event: 'sync' }, async () => {
          const presenceState = chatChannel?.presenceState() || {}
          const isConnected = Object.keys(presenceState).length > 1
          
          if (isConnected && !hasOpponentJoinedOnce) {
            // Opponent just joined! Fetch any messages missed during the connection gap
            const { data, error } = await supabase
              .from('messages')
              .select('*')
              .eq('session_id', sessionId)
              .order('created_at', { ascending: true })
            
            if (!error && data) {
              data.forEach(dbMsg => {
                if (!messages.value.find(m => m.id === dbMsg.id)) {
                  messages.value.push(dbMsg)
                }
              })
              messages.value.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            }
          }

          if (isConnected) hasOpponentJoinedOnce = true
          
          if (hasOpponentJoinedOnce) {
            isOpponentConnected.value = isConnected
          }
        })
        
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        isSubscribed = true; // prevent hanging if socket is slow
        resolve();
      }, 3000);

      chatChannel!.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          isSubscribed = true;
          await chatChannel?.track({ online_at: new Date().toISOString() })
          resolve();
        }
      })
    })
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user.value) return

    const messageId = crypto.randomUUID();
    const temporaryMessage: ChatMessage = {
      id: messageId,
      created_at: new Date().toISOString(),
      session_id: sessionId,
      sender_id: user.value.id,
      content: content.trim()
    }
    messages.value.push(temporaryMessage)

    setTyping(false)

    // Persist to DB FIRST to ensure recipient can fetch it if they miss the broadcast
    const { error } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          session_id: sessionId,
          sender_id: user.value.id,
          content: content.trim()
        })

    if (error) {
      chatError.value = "Failed to send message."
      console.error(error)
      return;
    }

    // Broadcast the message immediately after DB commit
    if (chatChannel && isSubscribed) {
      chatChannel.send({
        type: 'broadcast',
        event: 'message',
        payload: temporaryMessage
      }).catch(err => console.warn('Message broadcast failed:', err));
    }
  }

  const setTyping = async (isTyping: boolean) => {
    if (!chatChannel || !user.value || !isSubscribed) return

    if (typingTimeout) clearTimeout(typingTimeout)

    await chatChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.value.id, isTyping }
    }).catch(err => console.warn('Typing broadcast failed:', err));

    if (isTyping) {
      typingTimeout = setTimeout(() => setTyping(false), 3000)
    }
  }

  const leaveChat = async () => {
    destroy()
    await supabase.from('sessions').update({ status: 'ended' }).eq('id', sessionId)
  }

  const destroy = () => {
    if (typingTimeout) clearTimeout(typingTimeout)
    if (chatChannel) {
      supabase.removeChannel(chatChannel)
      chatChannel = null
    }
  }

  return {
    messages,
    isOpponentTyping,
    isOpponentConnected,
    error: chatError,
    initializeChat,
    sendMessage,
    setTyping,
    leaveChat,
    destroy
  }
}
