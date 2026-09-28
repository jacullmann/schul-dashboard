import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { isAxiosError } from 'axios';
import hw from '@/api/api';
import { useUserStore } from '@/stores/userStore';
import {
  isServiceWorkerSupported,
  serviceWorkerRegistration,
} from '@/modules/notifications/serviceWorker';

export type PushAvailability =
  | 'unsupported'
  | 'unavailable'
  | 'blocked'
  | 'available';

/**
 * The account that opted in on this browser. A subscription left behind by
 * someone else (e.g. after their session expired) is dropped rather than
 * silently handed to the next person who signs in.
 */
const OWNER_KEY = 'push:owner';

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Without storage the subscription is dropped at the next start instead.
  }
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function hasServerKey(
  subscription: PushSubscription,
  serverKey: Uint8Array,
): boolean {
  const key = subscription.options.applicationServerKey;
  if (!key || key.byteLength !== serverKey.byteLength) return false;
  const bytes = new Uint8Array(key);
  return bytes.every((byte, i) => byte === serverKey[i]);
}

async function existingSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export const usePushNotificationStore = defineStore('pushNotifications', () => {
  const userStore = useUserStore();

  const isSupported =
    isServiceWorkerSupported &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window;

  const permission = ref<NotificationPermission>(
    isSupported ? Notification.permission : 'default',
  );
  const isSubscribed = ref(false);
  const isBusy = ref(false);
  const isConfiguredOnServer = ref(true);
  let serverKey: Uint8Array<ArrayBuffer> | null = null;

  const availability = computed<PushAvailability>(() => {
    if (!isSupported) return 'unsupported';
    if (!isConfiguredOnServer.value) return 'unavailable';
    if (permission.value === 'denied') return 'blocked';
    return 'available';
  });

  async function fetchServerKey(): Promise<Uint8Array<ArrayBuffer> | null> {
    if (serverKey) return serverKey;
    try {
      const { data } = await hw.get<{ publicKey: string }>('/push/public-key');
      serverKey = base64UrlToBytes(data.publicKey);
      isConfiguredOnServer.value = true;
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 404) throw error;
      isConfiguredOnServer.value = false;
    }
    return serverKey;
  }

  /** Reuses the browser's subscription unless it belongs to a rotated key. */
  async function subscribe(
    key: Uint8Array<ArrayBuffer>,
  ): Promise<PushSubscription> {
    const registration = await serviceWorkerRegistration();
    const current = await registration.pushManager.getSubscription();
    if (current && hasServerKey(current, key)) return current;

    await current?.unsubscribe();
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
  }

  async function register(subscription: PushSubscription): Promise<void> {
    await hw.put('/push/subscription', subscription.toJSON());
    isSubscribed.value = true;
  }

  /** Reads the current state, e.g. before showing the settings. */
  async function refresh(): Promise<void> {
    if (!isSupported) return;
    permission.value = Notification.permission;
    isSubscribed.value = (await existingSubscription()) !== null;
    await fetchServerKey();
  }

  /** Must run inside the click handler: browsers only prompt on a user gesture. */
  async function enable(): Promise<void> {
    const userId = userStore.user?.id;
    if (!isSupported || !userId || isBusy.value) return;

    isBusy.value = true;
    try {
      permission.value = await Notification.requestPermission();
      if (permission.value !== 'granted') return;

      const key = await fetchServerKey();
      if (!key) return;

      await register(await subscribe(key));
      writeOwner(userId);
    } finally {
      isBusy.value = false;
    }
  }

  async function disable(): Promise<void> {
    if (!isSupported) return;

    isBusy.value = true;
    try {
      const subscription = await existingSubscription();
      writeOwner(null);
      isSubscribed.value = false;
      if (!subscription) return;

      // Unsubscribing first guarantees the device goes quiet. A failed
      // server call is harmless: the push service now rejects the endpoint
      // and the server drops it on the next delivery.
      await subscription.unsubscribe();
      await hw
        .delete('/push/subscription', {
          data: { endpoint: subscription.endpoint },
          _silent: true,
        })
        .catch(() => undefined);
    } finally {
      isBusy.value = false;
    }
  }

  /**
   * Re-registers this browser's subscription after sign-in, so it follows the
   * current login session and survives endpoint rotations by the browser.
   */
  async function sync(): Promise<void> {
    const userId = userStore.user?.id;
    if (!isSupported || !userId) return;

    permission.value = Notification.permission;
    const subscription = await existingSubscription();
    if (!subscription) {
      isSubscribed.value = false;
      return;
    }

    if (permission.value !== 'granted' || readOwner() !== userId) {
      await disable();
      return;
    }

    const key = await fetchServerKey();
    if (!key) {
      isSubscribed.value = false;
      return;
    }
    await register(await subscribe(key));
  }

  return {
    isSupported,
    permission,
    isSubscribed,
    isBusy,
    availability,
    refresh,
    enable,
    disable,
    sync,
  };
});
