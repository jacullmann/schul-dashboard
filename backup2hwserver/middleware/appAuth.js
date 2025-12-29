import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'app_gate_token';

export function setAppGateToken(res, secret) {
    const token = jwt.sign(
        { gate: true },
        secret,
        { expiresIn: '30d' }
    );

    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${token}; ` +
        `Domain=.schul-dashboard.com; ` +
        `Path=/; ` +
        `Max-Age=${30 * 24 * 60 * 60}; ` +
        `HttpOnly; ` +
        `Secure; ` +
        `SameSite=None; ` +
        `Partitioned`
    );

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

            // Token ist gültig
            req.appGate = true;
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
    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=; ` +
        `Domain=.schul-dashboard.com; ` +
        `Path=/; ` +
        `Max-Age=0; ` +
        `HttpOnly; ` +
        `Secure; ` +
        `SameSite=None; ` +
        `Partitioned`
    );
}

export function checkAppGate(secret) {
    return (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        req.appGate = false;

        if (token) {
            try {
                const payload = jwt.verify(token, secret);
                if (payload.gate) {
                    req.appGate = true;
                }
            } catch (err) {
            }
        }

        next();
    };
}