/**
 * Tenant context middleware.
 *
 * Extracts the tenant ID from the already-decoded app-gate JWT
 * and places it on `req.tenantId` for downstream handlers.
 *
 * Must be used AFTER `requireAppGate`.
 */

export function requireTenant(req, res, next) {
    const tenantId = req.appGateGroup?.id;

    if (!tenantId) {
        return res.status(403).json({ error: 'Tenant-Kontext fehlt' });
    }

    req.tenantId = tenantId;
    next();
}
