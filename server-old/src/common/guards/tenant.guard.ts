import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sb = this.supabaseService.getClient();

    let tenantId: string | null = request.activeGroupId || null;

    if (
      request.user?.globalRole === 'superadmin' &&
      request.headers['x-tenant-id'] &&
      typeof request.headers['x-tenant-id'] === 'string'
    ) {
      tenantId = request.headers['x-tenant-id'];
    }

    if (!tenantId) {
      throw new ForbiddenException({ error: 'Tenant-Kontext fehlt' });
    }

    if (request.user?.globalRole === 'superadmin') {
      request.tenantId = tenantId;
      const { data: group } = await sb
        .from('groups')
        .select('owner_id, permissions')
        .eq('id', tenantId)
        .maybeSingle();
      request.groupOwnerId = group?.owner_id || null;
      request.groupPermissions = group?.permissions || {};
      return true;
    }
    const { data: userRoles } = await sb
      .from('user_roles')
      .select('roles(name), groups(owner_id, permissions)')
      .eq('user_id', request.userId)
      .eq('tenant_id', tenantId)
      .limit(1);

    const membership = userRoles?.[0];
    const roleName = (membership as any)?.roles?.name;

    if (!membership || !roleName) {
      throw new ForbiddenException({ error: 'Kein Zugriff auf diesen Tenant' });
    }

    request.tenantId = tenantId;
    request.tenantRole = roleName;
    request.groupOwnerId = (membership as any)?.groups?.owner_id || null;
    request.groupPermissions = (membership as any)?.groups?.permissions || {};
    return true;
  }
}
