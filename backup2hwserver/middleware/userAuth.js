import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'auth_token';

export function setAuthToken(res, secret, { userId, email, role, activeGroupId, activeGroupName, groups = [] }) {
    const payload = {
        sub: userId.toString(),
        email,
        role,
        activeGroupId,
        activeGroupName,
        groups
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

/**
 * Middleware: require an authenticated, non-banned user context with groups.
 */
export function requireAuth(secret, supabase) {
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

            // Optional: You could fetch the banned status dynamically here,
            // or rely on caching / other mechanisms. Let's do a lightweight check for active banning:
            const { data: ban } = await supabase
                .from('banned_users')
                .select('id')
                .eq('user_id', payload.sub)
                .maybeSingle();

            if (ban) return res.status(403).json({ error: 'Account gesperrt' });

            // Populate both user and appGate contexts
            req.user = {
                sub: payload.sub,
                email: payload.email,
                role: payload.role || 'user',
            };
            req.userId = payload.sub;
            req.appGate = !!payload.activeGroupId;
            req.appGateGroup = payload.activeGroupId ? {
                id: payload.activeGroupId,
                name: payload.activeGroupName
            } : null;
            req.userGroups = payload.groups || [];

            next();
        } catch {
            return res.status(401).json({
                error: 'Auth-Token ungültig oder abgelaufen',
                requiresAuth: true,
            });
        }
    };
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
 * Middleware: optionally attach user info if auth token present.
 * Does NOT block if no token.
 */
export function checkAuth(secret) {
    return (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        req.user = null;
        req.userId = null;
        req.appGate = false;
        req.appGateGroup = null;
        req.userGroups = [];

        if (token) {
            try {
                const payload = jwt.verify(token, secret);
                if (payload.sub && payload.email) {
                    req.user = {
                        sub: payload.sub,
                        email: payload.email,
                        role: payload.role || 'user',
                    };
                    req.userId = payload.sub;
                    req.appGate = !!payload.activeGroupId;
                    req.appGateGroup = payload.activeGroupId ? {
                        id: payload.activeGroupId,
                        name: payload.activeGroupName
                    } : null;
                    req.userGroups = payload.groups || [];
                }
            } catch {
                // ignore
            }
        }

        next();
    };
}