/// <reference types="vite/client" />

import type { DefineComponent } from 'vue';
import type { UmamiPayload } from '@/core/analytics';

declare module '*.vue' {
  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    any
  >;
  export default component;
}

declare global {
  interface Window {
    umamiBeforeSend?: (type: string, payload: UmamiPayload) => UmamiPayload;
  }
}
