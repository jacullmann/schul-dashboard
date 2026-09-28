// Shared by the app and the service worker, so this file must only hold types
// that compile against both the DOM and the WebWorker libs.

/** The screen a notification opens. Mirrors `PushTarget` in `server/src/push/service.rs`. */
export type PushTarget = { type: 'groupMessages'; groupId: string };

/** A Web Push message. Mirrors `PushPayload` in `server/src/push/service.rs`. */
export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  timestamp: number;
  target: PushTarget;
}

/** What the service worker posts to the windows it controls. */
export type ServiceWorkerMessage =
  | { type: 'open-target'; target: PushTarget }
  | { type: 'subscription-changed' };
