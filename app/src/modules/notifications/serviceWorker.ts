import type { RouteLocationRaw } from 'vue-router';
import type { PushTarget } from '@/modules/notifications/types';

/** Built from `src/service-worker.ts`; see the `serviceWorker` plugin in `vite.config.ts`. */
const SERVICE_WORKER_URL = '/sw.js';

export const isServiceWorkerSupported =
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

/** Registers the worker (idempotent) and resolves once it is active. */
export async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: '/',
    // Vite serves the untranspiled source as an ES module during development.
    type: import.meta.env.DEV ? 'module' : 'classic',
    updateViaCache: 'none',
  });
  return navigator.serviceWorker.ready;
}

/** Registers once the page has loaded, so the worker never delays first paint. */
export function registerServiceWorker(): void {
  if (!isServiceWorkerSupported) return;

  const register = () => {
    serviceWorkerRegistration().catch((error: unknown) => {
      console.error('Service worker registration failed:', error);
    });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export function targetRoute(target: PushTarget): RouteLocationRaw {
  switch (target.type) {
    case 'groupMessages':
      return { name: 'group-messages', params: { groupId: target.groupId } };
  }
}

function isSameTarget(data: unknown, target: PushTarget): boolean {
  const other = data as Partial<PushTarget> | null;
  return other?.type === target.type && other.groupId === target.groupId;
}

/** Clears notifications about what the user is now looking at. */
export async function closeNotificationsFor(target: PushTarget): Promise<void> {
  if (!isServiceWorkerSupported) return;

  const registration = await navigator.serviceWorker.getRegistration();
  const notifications = (await registration?.getNotifications()) ?? [];
  for (const notification of notifications) {
    if (isSameTarget(notification.data, target)) notification.close();
  }
}
