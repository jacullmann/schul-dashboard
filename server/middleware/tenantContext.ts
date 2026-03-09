// middleware/tenantContext.ts
import type { Request, Response, NextFunction } from 'express';
import type { Supabase } from '../types/index.js';

/**
 * Extracts tenant ID and validates access.
 * Superadmins bypass the membership check.
 * Must be used AFTER requireAuth().
 */
export function requireTenant(supabase: Supabase) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const tenantId =
      (req.headers['x-tenant-id'] as string | undefined) || req.activeGroupId;

    if (!tenantId) {
      res.status(403).json({ error: 'Tenant-Kontext fehlt' });
      return;
    }

    // Superadmin has access to all tenants
    if (req.user?.globalRole === 'superadmin') {
      req.tenantId = tenantId;
      next();
      return;
    }

    // Check membership and fetch role
    const { data: membership } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', req.userId!)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const roleData = membership as any;
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
