import { ref, readonly, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/modules/chat/composables/useAuth';

export interface GameSession {
  id: string;
  human_id: string | null;
  ai_id: string | null;
  status: 'waiting' | 'active' | 'ended';
}

export function useMatchmaking() {
  const { profile } = useAuth();

  const isSearching = ref(false);
  const activeSession = ref<GameSession | null>(null);
  const matchError = ref<string | null>(null);

  let matchSubscription: RealtimeChannel | null = null;

  const cleanupSubscription = () => {
    if (matchSubscription) {
      supabase.removeChannel(matchSubscription);
      matchSubscription = null;
    }
  };

  const startSearching = async () => {
    if (!profile.value) {
      matchError.value = 'You must join the game first.';
      return;
    }

    isSearching.value = true;
    matchError.value = null;
    activeSession.value = null;

    try {
      // 1. Update profile status
      await supabase
        .from('intelligence_profiles')
        .update({ status: 'searching' })
        .eq('id', profile.value.id);

      // 2. Call the Atomic Matchmaking RPC
      const { data: sessionId, error: rpcError } = await supabase.rpc(
        'find_match',
        {
          user_role: profile.value.role,
        },
      );

      if (rpcError) throw rpcError;

      // 3. Fetch the initial state of the matched/created session
      const { data: sessionData, error: fetchErr } = await supabase
        .from('intelligence_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;

      // 4. Evaluate state. If active, we are ready.
      if (sessionData.status === 'active') {
        activeSession.value = sessionData;
        isSearching.value = false;
        return;
      }

      // 5. If waiting, subscribe to this specific row to wait for the opponent
      activeSession.value = sessionData;

      matchSubscription = supabase
        .channel(`session_wait_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'intelligence_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            const updatedSession = payload.new as GameSession;
            activeSession.value = updatedSession;

            if (updatedSession.status === 'active') {
              isSearching.value = false;
              cleanupSubscription(); // We found a match, stop listening to matchmaking changes
            }
          },
        )
        .subscribe();
    } catch (err: any) {
      matchError.value = err.message;
      isSearching.value = false;
      console.error('Matchmaking Error:', err);
    }
  };

  const cancelSearch = async () => {
    cleanupSubscription();
    isSearching.value = false;
    activeSession.value = null;

    if (profile.value) {
      await supabase
        .from('intelligence_profiles')
        .update({ status: 'idle' })
        .eq('id', profile.value.id);
    }
  };

  // Prevents dangling listeners if the user navigates away
  onUnmounted(() => {
    cleanupSubscription();
  });

  return {
    isSearching: readonly(isSearching),
    session: readonly(activeSession),
    error: readonly(matchError),
    startSearching,
    cancelSearch,
  };
}
