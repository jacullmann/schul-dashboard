import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/api';

interface AccessStatus {
  registrationOpen: boolean;
  maintenance: boolean;
}

/**
 * Whether superadmins paused sign-ups or put the platform into maintenance,
 * for the pages to say so upfront. The server enforces both regardless.
 */
export const useAccessStatusStore = defineStore('access-status', () => {
  const registrationOpen = ref(true);
  const maintenance = ref(false);

  async function load(): Promise<void> {
    try {
      const { data } = await api.get<AccessStatus>('/system/access');
      registrationOpen.value = data.registrationOpen;
      maintenance.value = data.maintenance;
    } catch {
      // The forms stay usable; a refused request explains itself.
    }
  }

  /** A request just met maintenance, which closes sign-ups as well. */
  function enterMaintenance(): void {
    maintenance.value = true;
    registrationOpen.value = false;
  }

  return { registrationOpen, maintenance, load, enterMaintenance };
});
