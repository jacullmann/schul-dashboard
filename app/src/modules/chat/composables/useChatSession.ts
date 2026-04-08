import { ref, readonly } from 'vue'
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

  const initializeChat = async () => {
    if (!sessionId || !user.value) return

    chatError.value = null
    messages.value = []
    isOpponentConnected.value = true
    hasOpponentJoinedOnce = false

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
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
            (payload) => {
              const newMessage = payload.new as ChatMessage
              // OPTIMISTIC UI CHECK: Only push the message if it's from the OPPONENT.
              // We already rendered our own messages locally during sendMessage().
              if (newMessage.sender_id !== user.value?.id) {
                messages.value.push(newMessage)
              }
            }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.userId !== user.value?.id) {
            isOpponentTyping.value = payload.isTyping
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = chatChannel?.presenceState() || {}
          const isConnected = Object.keys(presenceState).length > 1
          if (isConnected) hasOpponentJoinedOnce = true
          
          if (hasOpponentJoinedOnce) {
            isOpponentConnected.value = isConnected
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await chatChannel?.track({ online_at: new Date().toISOString() })
          }
        })
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user.value) return

    // OPTIMISTIC UI: Instantly render the message on our own screen
    const temporaryMessage: ChatMessage = {
      id: crypto.randomUUID(), // Temp ID until DB sync
      created_at: new Date().toISOString(),
      session_id: sessionId,
      sender_id: user.value.id,
      content: content.trim()
    }
    messages.value.push(temporaryMessage)

    // Stop typing indicator instantly
    setTyping(false)

    // Fire it to the database silently in the background
    const { error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender_id: user.value.id,
          content: content.trim()
        })

    if (error) {
      chatError.value = "Failed to send message."
      console.error(error)
      // If it fails, you would ideally pop the temporary message back off the array here
    }
  }

  const setTyping = async (isTyping: boolean) => {
    if (!chatChannel || !user.value) return

    if (typingTimeout) clearTimeout(typingTimeout)

    await chatChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.value.id, isTyping }
    })

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