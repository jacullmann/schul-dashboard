import type { RouteLocationNamedRaw } from 'vue-router';

export function taskListRoute(groupId: string): RouteLocationNamedRaw {
  return { name: 'group-tasks', params: { groupId } };
}

export function taskRoute(
  groupId: string,
  taskId: string,
): RouteLocationNamedRaw {
  return { name: 'group-task', params: { groupId, taskId } };
}
