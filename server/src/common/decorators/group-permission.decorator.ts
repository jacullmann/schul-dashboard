import { SetMetadata } from '@nestjs/common';

export const GROUP_PERMISSION_KEY = 'group_permission';
export const GroupPermission = (permissionKey: string) =>
  SetMetadata(GROUP_PERMISSION_KEY, permissionKey);
