// middleware/userAuth.js
import jwt from 'jsonwebtoken';
import * as db from '../db/db.js';

const COOKIE_NAME = 'auth_token';

/**
 * Issue a lean JWT. No groups array – that comes from a separate endpoint.
 */
export function setAuthToken(res, secret, { userId, email, globalRole, activeGroupId }) {
    const payload = {
        sub: userId.toString(),
        email,
        gRole: globalRole || 'user',      // global role: 'superadmin' | 'user'
        gId: activeGroupId || null,        // active tenant id
    };

    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return token;
}

export function clearAuthToken(res) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'None',
    });
}

/**
 * Core auth middleware factory.
 *
 * Usage:
 *   requireAuth(secret, supabase)                    → any authenticated, non-banned user
 *   requireAuth(secret, supabase, 'superadmin')      → global superadmin only
 *   requireAuth(secret, supabase, ['admin', 'mod'])   → tenant-scoped role check (requires x-tenant-id)
 *
 * Populates: req.user, req.userId, req.activeGroupId
 */
export function requireAuth(secret, supabase, requiredRole) {
    return async (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                error: 'Authentifizierung erforderlich',
                requiresAuth: true,
            });
        }

        try {
            const payload = jwt.verify(token, secret);

            if (!payload.sub || !payload.email) {
                return res.status(401).json({ error: 'Ungültiges Auth-Token', requiresAuth: true });
            }

            // Ban check
            const { data: ban } = await supabase
                .from('banned_users')
                .select('id')
                .eq('user_id', payload.sub)
                .maybeSingle();

            if (ban) return res.status(403).json({ error: 'Account gesperrt' });

            // Populate user context
            req.user = {
                sub: payload.sub,
                email: payload.email,
                globalRole: payload.gRole || 'user',
            };
            req.userId = payload.sub;
            req.activeGroupId = payload.gId || null;

            // ── Role checks ──

            // 1) Global superadmin check
            if (requiredRole === 'superadmin') {
                if (req.user.globalRole !== 'superadmin') {
                    return res.status(403).json({ error: 'Keine Berechtigung' });
                }
                return next();
            }

            // 2) Tenant-scoped role check (e.g. ['admin', 'mod'])
            if (Array.isArray(requiredRole)) {
                const tenantId = req.headers['x-tenant-id'] || req.activeGroupId;
                if (!tenantId) {
                    return res.status(403).json({ error: 'Tenant-Kontext fehlt' });
                }
                req.tenantId = tenantId;

                // Superadmin bypasses tenant role checks
                if (req.user.globalRole === 'superadmin') {
                    return next();
                }

                // Look up user's role in this specific tenant
                const { data: userRole } = await supabase
                    .from('user_roles')
                    .select('roles(name)')
                    .eq('user_id', payload.sub)
                    .eq('tenant_id', tenantId)
                    .maybeSingle();

                const tenantRoleName = userRole?.roles?.name;
                if (!tenantRoleName || !requiredRole.includes(tenantRoleName)) {
                    return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
                }

                req.tenantRole = tenantRoleName;
                return next();
            }

            // 3) No specific role required – just authenticated
            next();
        } catch {
            return res.status(401).json({
                error: 'Auth-Token ungültig oder abgelaufen',
                requiresAuth: true,
            });
        }
    };
}

/**
 * Lightweight: attach user if token present, don't block if missing.
 */
export function checkAuth(secret) {
    return (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        req.user = null;
        req.userId = null;
        req.activeGroupId = null;

        if (token) {
            try {
                const payload = jwt.verify(token, secret);
                if (payload.sub && payload.email) {
                    req.user = {
                        sub: payload.sub,
                        email: payload.email,
                        globalRole: payload.gRole || 'user',
                    };
                    req.userId = payload.sub;
                    req.activeGroupId = payload.gId || null;
                }
            } catch {
                // ignore – user stays null
            }
        }

        next();
    };
}