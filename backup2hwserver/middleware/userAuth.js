import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'user_token';

export function setUserToken(res, userId, email, secret) {
    const token = jwt.sign(
        {
            sub: userId.toString(),
            email
        },
        secret,
        { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${token}; ` +
        `Domain=.schul-dashboard.com; ` +
        `Path=/; ` +
        `Max-Age=${7 * 24 * 60 * 60}; ` +
        `HttpOnly; ` +
        `Secure; ` +
        `SameSite=None; ` +
        `Partitioned`
    );

    return token;
}

export function requireUser(secret, BannedUserModel, UserModel) {
    return async (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                error: 'Benutzer-Authentifizierung erforderlich',
                requiresLogin: true
            });
        }

        try {
            const payload = jwt.verify(token, secret);

            if (!payload.sub || !payload.email) {
                return res.status(401).json({
                    error: 'Ungültiges User-Token'
                });
            }

            const user = await UserModel.findById(payload.sub).lean();
            if (!user) return res.status(401).json({ error: 'User nicht gefunden' });

            const isBanned = await BannedUserModel.findOne({ userId: payload.sub }).lean();
            if (isBanned) return res.status(403).json({ error: 'Account gesperrt' });

            req.user = {
                sub: payload.sub,
                email: payload.email,
                isAdmin: user.isAdmin
            };
            next();
        } catch (err) {
            return res.status(401).json({
                error: 'User-Token ungültig oder abgelaufen',
                requiresLogin: true
            });
        }
    };
}

export function clearUserToken(res) {
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

export function checkUser(secret, UserModel) {
    return async (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];
        req.user = null;

        if (token) {
            try {
                const payload = jwt.verify(token, secret);
                if (payload.sub && payload.email) {
                    const user = await UserModel.findById(payload.sub)
                        .select('isAdmin')
                        .lean();

                    req.user = {
                        sub: payload.sub,
                        email: payload.email,
                        isAdmin: user?.isAdmin || false
                    };
                }
            } catch (err) {
            }
        }

        next();
    };
}