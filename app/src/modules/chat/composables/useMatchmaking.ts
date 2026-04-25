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
        .from('profiles')
        .update({ status: 'searching' })
        .eq('id', profile.value.id);

      // 2. Check if the user already has an active or waiting session
      const { data: existingSessions, error: existingErr } = await supabase
        .from('sessions')
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
      const channel = supabase.channel(`session_wait_${sessionId}`);
      matchSubscription = channel;

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
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
      );

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Matchmaking subscription timeout'));
        }, 10000);

        channel.subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error(err?.message || 'Channel error'));
          } else if (status === 'TIMED_OUT') {
            clearTimeout(timeout);
            reject(new Error('Subscription timed out'));
          }
        });
      });

      // 5. Fetch the initial state of the matched/created session
      const { data: sessionData, error: fetchErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;

      // 6. Evaluate state. If active, we are ready.
      if (sessionData.status === 'active') {
        activeSession.value = sessionData;
        isSearching.value = false;
        cleanupSubscription();
        return;
      }

      // 7. If waiting, just update the active session (subscription is already active)
      activeSession.value = sessionData;
    } catch (err: any) {
      cleanupSubscription();
      matchError.value = err.message;
      isSearching.value = false;
      console.error('Matchmaking Error:', err);
    }
  };

  const recoverSession = async () => {
    if (!profile.value) return;

    try {
      const { data: existingSessions, error: fetchErr } = await supabase
        .from('sessions')
        .select('*')
        .in('status', ['waiting', 'active'])
        .or(`human_id.eq.${profile.value.id},ai_id.eq.${profile.value.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchErr) throw fetchErr;

      if (existingSessions && existingSessions.length > 0) {
        const sessionId = existingSessions[0].id;

        if (existingSessions[0].status === 'waiting') {
          isSearching.value = true;
        }

        activeSession.value = existingSessions[0];

        // Re-attach subscription for existing session
        const channel = supabase.channel(`session_wait_${sessionId}`);
        matchSubscription = channel;

        channel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'sessions',
              filter: `id=eq.${sessionId}`,
            },
            (payload) => {
              activeSession.value = payload.new as GameSession;
              if (payload.new.status === 'active') {
                isSearching.value = false;
                cleanupSubscription();
              }
            },
          )
          .subscribe();
      }
    } catch (err: any) {
      console.error('Session recovery failed:', err);
    }
  };

  const cancelSearch = async () => {
    cleanupSubscription();
    isSearching.value = false;

    if (activeSession.value) {
      await supabase
        .from('sessions')
        .update({ status: 'ended' })
        .eq('id', activeSession.value.id);
    }

    activeSession.value = null;

    if (profile.value) {
      await supabase
        .from('profiles')
        .update({ status: 'idle' })
        .eq('id', profile.value.id);
    }
  };

  // Prevents dangling listeners if the user navigates away
  onUnmounted(() => {
    cleanupSubscription();
  });

  return {
    isSearching,
    session: activeSession,
    error: matchError,
    startSearching,
    cancelSearch,
    recoverSession,
  };
}
