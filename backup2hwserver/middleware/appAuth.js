import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'app_gate_token';

export function setAppGateToken(res, secret) {
    const token = jwt.sign(
        { gate: true },
        secret,
        { expiresIn: '30d' }
    );

    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 Tage
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
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    });
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