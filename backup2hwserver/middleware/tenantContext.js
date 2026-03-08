// middleware/tenantContext.js

/**
 * Extracts tenant ID and validates access.
 * Superadmins bypass the membership check.
 * Must be used AFTER requireAuth().
 */
export function requireTenant(supabase) {
    return async (req, res, next) => {
        const tenantId = req.headers['x-tenant-id'] || req.activeGroupId;

        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant-Kontext fehlt' });
        }

        // Superadmin has access to all tenants
        if (req.user?.globalRole === 'superadmin') {
            req.tenantId = tenantId;
            return next();
        }

        // Check membership
        const { data: membership } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', req.userId)
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (!membership) {
            return res.status(403).json({ error: 'Kein Zugriff auf diesen Tenant' });
        }

        req.tenantId = tenantId;
        next();
    };
}
