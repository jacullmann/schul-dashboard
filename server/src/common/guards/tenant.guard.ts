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
      return true;
    }

    const sb = this.supabaseService.getClient();
    const { data: membership } = await sb
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', request.userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const roleName = (membership as any)?.roles?.name;

    if (!membership || !roleName) {
      throw new ForbiddenException({ error: 'Kein Zugriff auf diesen Tenant' });
    }

    request.tenantId = tenantId;
    request.tenantRole = roleName;
    return true;
  }
}
