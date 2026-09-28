/// <reference lib="webworker" />
import type {
  PushPayload,
  PushTarget,
  ServiceWorkerMessage,
} from '@/modules/notifications/types';

declare const self: ServiceWorkerGlobalScope;

/** Not yet part of TypeScript's WebWorker lib. */
interface PushSubscriptionChangeEvent extends ExtendableEvent {
  readonly oldSubscription: PushSubscription | null;
  readonly newSubscription: PushSubscription | null;
}

/** Fields browsers support beyond TypeScript's `NotificationOptions`. */
interface RichNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  timestamp?: number;
}

const NOTIFICATION_ICON = '/icon-192.png';

self.addEventListener('install', () => {
  // Nothing is precached, so a new version can take over without a reload.
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = parsePayload(event.data);
  if (payload) event.waitUntil(showNotification(payload));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data as PushTarget | null;
  if (target) event.waitUntil(openTarget(target));
});

self.addEventListener('pushsubscriptionchange', (event) => {
  const change = event as PushSubscriptionChangeEvent;
  change.waitUntil(renewSubscription(change));
});

const TARGET_TYPES: ReadonlySet<string> = new Set<PushTarget['type']>([
  'groupAnnouncements',
  'groupSchedule',
]);

/** The router path of a target, for windows that are not open yet. */
function targetPath(target: PushTarget): string {
  const group = `/groups/${encodeURIComponent(target.groupId)}`;
  switch (target.type) {
    case 'groupAnnouncements':
      return `${group}/dashboard`;
    case 'groupSchedule':
      return `${group}/schedule`;
  }
}

function parsePayload(data: PushMessageData | null): PushPayload | null {
  try {
    const payload = data?.json() as Partial<PushPayload> | undefined;
    const isValid =
      typeof payload?.title === 'string' &&
      typeof payload.body === 'string' &&
      (payload.tag === undefined || typeof payload.tag === 'string') &&
      typeof payload.target?.groupId === 'string' &&
      TARGET_TYPES.has(payload.target.type);
    return isValid ? (payload as PushPayload) : null;
  } catch {
    return null;
  }
}

function windowClients(): Promise<readonly WindowClient[]> {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
}

async function showNotification(payload: PushPayload): Promise<void> {
  const options: RichNotificationOptions = {
    body: payload.body,
    tag: payload.tag,
    // Browsers reject `renotify` without a tag.
    renotify: payload.tag !== undefined,
    timestamp: payload.timestamp,
    icon: NOTIFICATION_ICON,
    data: payload.target,
  };
  await self.registration.showNotification(payload.title, options);
}

async function openTarget(target: PushTarget): Promise<void> {
  const clients = await windowClients();
  const client = clients.find((c) => c.focused) ?? clients[0];

  if (!client) {
    await self.clients.openWindow(targetPath(target));
    return;
  }

  // The open app navigates itself, keeping its state instead of reloading.
  await client.focus();
  postMessage(client, { type: 'open-target', target });
}

async function renewSubscription(
  event: PushSubscriptionChangeEvent,
): Promise<void> {
  const applicationServerKey =
    event.oldSubscription?.options.applicationServerKey;
  if (!event.newSubscription && applicationServerKey) {
    await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  // Registering with the API needs the CSRF cookie, which a worker cannot
  // read. Open windows do it now; otherwise the app does on its next start.
  for (const client of await windowClients()) {
    postMessage(client, { type: 'subscription-changed' });
  }
}

function postMessage(client: Client, message: ServiceWorkerMessage): void {
  client.postMessage(message);
}
