/**
 * Every group-bound endpoint names its group in the path, so a request can
 * never act on a group other than the one the caller chose. Calling it
 * without a group is a programming error and fails before any request.
 */
export function groupPath(
  groupId: string | null | undefined,
  path = '',
): string {
  if (!groupId)
    throw new Error(`No group given for ${path || 'group request'}`);
  return `/groups/${encodeURIComponent(groupId)}${path}`;
}
