import type { RouteLocationNamedRaw } from 'vue-router';

export function inviteRoute(token: string): RouteLocationNamedRaw {
  return { name: 'group-invite', params: { token } };
}
