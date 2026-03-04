import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'app_gate_token';

export function setAppGateToken(res, secret, { groupId, groupName }) {
    const token = jwt.sign(
        { gate: true, groupId, groupName },
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

            if (!payload.gate || !payload.groupId) {
                return res.status(401).json({
                    error: 'Ungültiges App-Gate Token'
                });
            }

            req.appGate = true;
            req.appGateGroup = {
                id: payload.groupId,
                name: payload.groupName
            };
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

        if (token) {
            try {
                const payload = jwt.verify(token, secret);
                if (payload.gate && payload.groupId) {
                    req.appGate = true;
                    req.appGateGroup = {
                        id: payload.groupId,
                        name: payload.groupName
                    };
                }
            } catch (err) {
            }
        }

        next();
    };
}