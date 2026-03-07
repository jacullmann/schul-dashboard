import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'app_gate_token';

// Now sets the active context but also includes a list of allowed groups.
export function setAppGateToken(res, secret, { userId, activeGroupId, activeGroupName, groups = [] }) {
    const token = jwt.sign(
        { gate: true, userId, activeGroupId, activeGroupName, groups },
        secret,
        { expiresIn: '30d' }
    );

    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'None',
        maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return token;
}

export function requireAppGate(secret) {
    return (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                error: 'Authentifizierung erforderlich',
                requiresAppGate: true
            });
        }

        try {
            const payload = jwt.verify(token, secret);

            if (!payload.gate) {
                return res.status(401).json({
                    error: 'Ungültiges App-Gate Token'
                });
            }

            req.appGate = true;
            req.userId = payload.userId || null;
            req.appGateGroup = payload.activeGroupId ? {
                id: payload.activeGroupId,
                name: payload.activeGroupName
            } : null;
            req.userGroups = payload.groups || [];
            next();
        } catch (err) {
            return res.status(401).json({
                error: 'App-Gate Token ungültig oder abgelaufen',
                requiresAppGate: true
            });
        }
    };
}

export function clearAppGateToken(res) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'None',
    });
}

export function checkAppGate(secret) {
    return (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        req.appGate = false;
        req.appGateGroup = null;
        req.userGroups = [];
        req.userId = null;

        if (token) {
            try {
                const payload = jwt.verify(token, secret);
                if (payload.gate) {
                    req.appGate = true;
                    req.userId = payload.userId || null;
                    if (payload.activeGroupId) {
                        req.appGateGroup = {
                            id: payload.activeGroupId,
                            name: payload.activeGroupName
                        };
                    }
                    req.userGroups = payload.groups || [];
                }
            } catch (err) {
            }
        }

        next();
    };
}