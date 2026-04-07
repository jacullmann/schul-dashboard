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

      // 2. Check if the user already has an active or waiting session
      const { data: existingSessions, error: existingErr } = await supabase
        .from('intelligence_sessions')
        .select('*')
        .in('status', ['waiting', 'active'])
        .or(`human_id.eq.${profile.value.id},ai_id.eq.${profile.value.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingErr) throw existingErr;

      let sessionId: string;

      if (existingSessions && existingSessions.length > 0) {
        sessionId = existingSessions[0].id;
      } else {
        // 3. Call the Atomic Matchmaking RPC if no existing session
        const { data: rpcSessionId, error: rpcError } = await supabase.rpc(
          'find_match',
          {
            user_role: profile.value.role,
          },
        );

        if (rpcError) throw rpcError;
        sessionId = rpcSessionId;
      }

      // 4. Setup the subscription BEFORE evaluating the state to prevent race conditions
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

      // 4. Fetch the initial state of the matched/created session
      const { data: sessionData, error: fetchErr } = await supabase
        .from('intelligence_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;

      // 5. Evaluate state. If active, we are ready.
      if (sessionData.status === 'active') {
        activeSession.value = sessionData;
        isSearching.value = false;
        cleanupSubscription();
        return;
      }

      // 6. If waiting, just update the active session (subscription is already active)
      activeSession.value = sessionData;
    } catch (err: any) {
      cleanupSubscription();
      matchError.value = err.message;
      isSearching.value = false;
      console.error('Matchmaking Error:', err);
    }
  };

  const cancelSearch = async () => {
    cleanupSubscription();
    isSearching.value = false;

    if (activeSession.value) {
      await supabase
        .from('intelligence_sessions')
        .update({ status: 'ended' })
        .eq('id', activeSession.value.id);
    }

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
