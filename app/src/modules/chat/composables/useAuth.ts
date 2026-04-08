import { ref, readonly } from 'vue';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type PlayerRole = 'ai' | 'human';
export interface PlayerProfile {
  id: string;
  role: PlayerRole;
  status: 'idle' | 'searching' | 'chatting';
}

const currentUser = ref<User | null>(null);
const currentProfile = ref<PlayerProfile | null>(null);
const isAuthLoading = ref(true);
const authError = ref<string | null>(null);

export function useAuth() {
  const initializeAuth = async () => {
    isAuthLoading.value = true;
    try {
      // 1. Check for existing session first to avoid MAU bloat on refresh
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        currentUser.value = session.user;
        await fetchProfile(session.user.id);
      }
    } catch (err: any) {
      authError.value = err.message;
    } finally {
      isAuthLoading.value = false;
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('intelligence_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "Row not found"
    currentProfile.value = data;
  };

  const joinGame = async (role: PlayerRole) => {
    isAuthLoading.value = true;
    authError.value = null;

    try {
      let userId = currentUser.value?.id;

      // If not already authenticated, sign in anonymously
      if (!userId) {
        const { data: authData, error: authErr } =
          await supabase.auth.signInAnonymously();
        if (authErr) throw authErr;
        userId = authData.user?.id;
        currentUser.value = authData.user;
      }

      if (!userId) throw new Error('Failed to secure an Auth ID.');

      // Upsert the profile (creates or updates status/role)
      const { data: profileData, error: profileErr } = await supabase
        .from('intelligence_profiles')
        .upsert({ id: userId, role, status: 'idle' }, { onConflict: 'id' })
        .select();

      if (profileErr) throw profileErr;
      currentProfile.value = profileData && profileData.length > 0 ? profileData[0] : null;
    } catch (err: any) {
      authError.value = err.message;
      console.error('Join Game Error:', JSON.stringify(err, null, 2), err);
      throw err;
    } finally {
      isAuthLoading.value = false;
    }
  };

  return {
    user: readonly(currentUser),
    profile: readonly(currentProfile),
    isLoading: readonly(isAuthLoading),
    error: readonly(authError),
    initializeAuth,
    joinGame,
  };
}
