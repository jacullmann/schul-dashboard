import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const TENANT_ROLES_KEY = 'tenant_roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      TENANT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    if (request.user?.globalRole === 'superadmin') {
      return true;
    }

    // Group owners bypass all roles checks in their own group
    if (request.groupOwnerId && request.userId === request.groupOwnerId) {
      return true;
    }

    const tenantRole = request.tenantRole;

    if (!tenantRole || !requiredRoles.includes(tenantRole)) {
      throw new ForbiddenException('Insufficient permissions for this group.');
    }

    return true;
  }
}
