import { useRouter, type RouteLocationRaw } from 'vue-router';

/** Full URLs of app routes, for links shared outside the app. */
export function useAbsoluteUrl() {
  const router = useRouter();

  function absoluteUrl(to: RouteLocationRaw): string {
    return new URL(router.resolve(to).href, window.location.origin).href;
  }

  return { absoluteUrl };
}
