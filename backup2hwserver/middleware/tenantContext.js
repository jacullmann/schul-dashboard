/**
 * Tenant context middleware.
 *
 * Extracts the tenant ID from the 'x-tenant-id' header and validates it against
 * the user's groups in the already-decoded app-gate JWT. places it on `req.tenantId` for downstream handlers.
 * Superadmins bypass the array check, but still need the header or default.
 * Must be used AFTER `requireAuth`.
 */

export function requireTenant(req, res, next) {
    const requestedTenantId = req.headers['x-tenant-id'] || (req.appGateGroup ? req.appGateGroup.id : null);

    if (!requestedTenantId) {
        return res.status(403).json({ error: 'Tenant-Kontext fehlt' });
    }

    const isSuperAdmin = req.user?.role === 'superadmin';

    if (!isSuperAdmin) {
        const hasAccess = req.userGroups?.some(g => g.id === requestedTenantId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Fehlende Berechtigung für diesen Tenant' });
        }
    }

    req.tenantId = requestedTenantId;
    next();
}
