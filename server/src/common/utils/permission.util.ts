export function checkRolePermission(
  userRole: string | null,
  requiredRole: string,
): boolean {
  if (userRole === 'admin') return true;
  if (requiredRole === 'admin') return false;

  if (userRole === 'moderator') return true;
  if (requiredRole === 'moderator') return false;

  if (userRole === 'user') return requiredRole === 'user';
  return false;
}
