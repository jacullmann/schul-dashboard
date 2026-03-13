// middleware/tenantContext.ts
import type { Request, Response, NextFunction } from 'express';
import type { Supabase } from '../types/index.js';

/**
 * Extracts tenant ID from the verified JWT and validates access.
 *
 * SECURITY: The tenant is **always** taken from `req.activeGroupId`, which is
 * populated by `requireAuth` / `checkAuth` from the signed JWT `gId` claim.
 * We never read `x-tenant-id` (or any other client-supplied header) for
 * regular users — doing so would allow header-based tenant spoofing.
 *
 * Superadmins may override the tenant via the `x-tenant-id` header for
 * administrative cross-tenant operations.
 *
 * Must be used AFTER requireAuth().
 */
export function requireTenant(supabase: Supabase) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Default: JWT-embedded active group.
    let tenantId: string | null = req.activeGroupId;

    // Superadmin override: allow cross-tenant access via header.
    if (
      req.user?.globalRole === 'superadmin' &&
      req.headers['x-tenant-id'] &&
      typeof req.headers['x-tenant-id'] === 'string'
    ) {
      tenantId = req.headers['x-tenant-id'];
    }

    if (!tenantId) {
      res.status(403).json({ error: 'Tenant-Kontext fehlt' });
      return;
    }

    // Superadmin bypasses the membership check entirely.
    if (req.user?.globalRole === 'superadmin') {
      req.tenantId = tenantId;
      next();
      return;
    }

    // Regular user: verify membership and fetch tenant role.
    const { data: membership } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', req.userId!)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const roleData = membership as { roles?: { name?: string } } | null;
    const roleName = roleData?.roles?.name;

    if (!membership || !roleName) {
      res.status(403).json({ error: 'Kein Zugriff auf diesen Tenant' });
      return;
    }

    req.tenantId = tenantId;
    req.tenantRole = roleName;
    next();
  };
}
