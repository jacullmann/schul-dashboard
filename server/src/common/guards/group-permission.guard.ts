import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GROUP_PERMISSION_KEY } from '../decorators/group-permission.decorator';
import { checkRolePermission } from '../utils/permission.util';

@Injectable()
export class GroupPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissionKey = this.reflector.getAllAndOverride<string>(
      GROUP_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Superadmins bypass all group-level permission checks
    if (request.user?.globalRole === 'superadmin') {
      return true;
    }

    // Group owners bypass all group-level permission checks
    if (request.groupOwnerId && request.userId === request.groupOwnerId) {
      return true;
    }

    const tenantRole = request.tenantRole;
    if (!tenantRole) {
      throw new ForbiddenException('Kein Rollenkontext im Tenant vorhanden.');
    }

    const defaultPermissions: Record<string, string> = {
      edit_group_general: 'moderator',
      edit_subjects_courses: 'admin',
      edit_schedule: 'admin',
      create_items: 'user',
      upload_images: 'user',
      manage_notes: 'moderator',
      send_messages: 'user',
      manage_schedule_changes: 'moderator',
      manage_announcements: 'moderator',
      moderate_members: 'moderator',
      delete_other_content: 'moderator',
    };

    const allowedRole =
      request.groupPermissions?.[permissionKey] ||
      defaultPermissions[permissionKey] ||
      'admin';

    const isAllowed = checkRolePermission(tenantRole, allowedRole);

    if (!isAllowed) {
      throw new ForbiddenException(
        `Du hast keine Berechtigung für diese Aktion. Erforderliche Rolle: ${allowedRole}`,
      );
    }

    return true;
  }
}
