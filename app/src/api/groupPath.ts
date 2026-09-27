/**
 * Every group-bound endpoint names its group in the path, so a request can
 * never act on a group other than the one the caller chose.
 */
export function groupPath(groupId: string, path = ''): string {
  return `/groups/${encodeURIComponent(groupId)}${path}`;
}
