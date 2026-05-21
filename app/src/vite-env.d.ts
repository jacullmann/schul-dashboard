/// <reference types="vite/client" />

import type { DefineComponent } from 'vue';

declare module '*.vue' {
  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    any
  >;
  export default component;
}

declare module 'vue' {
  interface ComponentCustomDirectives {
    vRipple: typeof import('@/common/directives/vRipple').vRipple;
  }
}

declare global {
  interface Window {
    __removeInitialLoadingScreen?: () => void;
  }
}
