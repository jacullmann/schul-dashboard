/**
 * Extracts tenant ID and validates access.
 * Superadmins bypass the membership check.
 * Must be used AFTER requireAuth().
 */
export function requireTenant(supabase) {
    return async (req, res, next) => {
        const tenantId = req.headers['x-tenant-id'] || req.activeGroupId;
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
        // Check membership
        const { data: membership } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', req.userId)
            .eq('tenant_id', tenantId)
            .maybeSingle();
        if (!membership) {
            res.status(403).json({ error: 'Kein Zugriff auf diesen Tenant' });
            return;
        }
        req.tenantId = tenantId;
        next();
    };
}
//# sourceMappingURL=tenantContext.js.map