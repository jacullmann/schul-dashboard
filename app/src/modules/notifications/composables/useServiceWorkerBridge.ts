import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useEventListener } from '@vueuse/core';
import { useUserStore } from '@/stores/userStore';
import { usePushNotificationStore } from '@/stores/pushNotificationStore';
import {
  closeNotificationsFor,
  isServiceWorkerSupported,
  targetRoute,
} from '@/modules/notifications/serviceWorker';
import type {
  PushTarget,
  ServiceWorkerMessage,
} from '@/modules/notifications/types';

/**
 * Connects the app shell to the service worker: follows notification clicks
 * within the running app, keeps the push subscription registered for the
 * signed-in user and clears notifications for what is on screen.
 */
export function useServiceWorkerBridge(): void {
  const route = useRoute();
  const router = useRouter();
  const { user } = storeToRefs(useUserStore());
  const pushNotifications = usePushNotificationStore();

  const syncSubscription = () => {
    pushNotifications.sync().catch((error: unknown) => {
      console.error('Push subscription sync failed:', error);
    });
  };

  if (isServiceWorkerSupported) {
    useEventListener(
      navigator.serviceWorker,
      'message',
      (event: MessageEvent<ServiceWorkerMessage>) => {
        const message = event.data;
        switch (message.type) {
          case 'open-target':
            void router.push(targetRoute(message.target));
            break;
          case 'subscription-changed':
            syncSubscription();
            break;
        }
      },
    );
  }

  watch(
    () => user.value?.id,
    (userId) => {
      if (userId) syncSubscription();
    },
    { immediate: true },
  );

  // Every page of a group shows its announcements in the banner.
  const visibleTargets = computed<PushTarget[]>(() => {
    const groupId = route.params.groupId;
    if (typeof groupId !== 'string') return [];

    const targets: PushTarget[] = [{ type: 'groupAnnouncements', groupId }];
    if (route.name === 'group-schedule') {
      targets.push({ type: 'groupSchedule', groupId });
    }
    return targets;
  });

  watch(visibleTargets, (targets) => void closeNotificationsFor(targets), {
    immediate: true,
  });
}
