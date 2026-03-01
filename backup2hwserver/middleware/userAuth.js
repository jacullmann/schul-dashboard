import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'user_token';

export function setUserToken(res, userId, email, secret) {
    const token = jwt.sign(
        { sub: userId.toString(), email },
        secret,
        { expiresIn: '7d' }
    );

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
 * Middleware: require an authenticated, non-banned user.
 * Now uses Supabase instead of Mongoose.
 */
export function requireUser(secret, supabase) {
    return async (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                error: 'Benutzer-Authentifizierung erforderlich',
                requiresLogin: true,
            });
        }

        try {
            const payload = jwt.verify(token, secret);

            if (!payload.sub || !payload.email) {
                return res.status(401).json({ error: 'Ungültiges User-Token' });
            }

            const { data: user } = await supabase
                .from('users')
                .select('id, email, user_roles(roles(name))')
                .eq('id', payload.sub)
                .maybeSingle();

            if (!user) return res.status(401).json({ error: 'User nicht gefunden' });

            const { data: ban } = await supabase
                .from('banned_users')
                .select('id')
                .eq('user_id', payload.sub)
                .maybeSingle();

            if (ban) return res.status(403).json({ error: 'Account gesperrt' });

            req.user = {
                sub: payload.sub,
                email: payload.email,
                role: user.user_roles?.[0]?.roles?.name || 'user',
            };
            next();
        } catch {
            return res.status(401).json({
                error: 'User-Token ungültig oder abgelaufen',
                requiresLogin: true,
            });
        }
    };
}

export function clearUserToken(res) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'None',
    });
}

/**
 * Middleware: optionally attach user info if token present.
 * Does NOT block if no token.
 */
export function checkUser(secret, supabase) {
    return async (req, res, next) => {
        const token = req.cookies[COOKIE_NAME];
        req.user = null;

        if (token) {
            try {
                const payload = jwt.verify(token, secret);
                if (payload.sub && payload.email) {
                    const { data: user } = await supabase
                        .from('users')
                        .select('user_roles(roles(name))')
                        .eq('id', payload.sub)
                        .maybeSingle();

                    req.user = {
                        sub: payload.sub,
                        email: payload.email,
                        role: user?.user_roles?.[0]?.roles?.name || 'user',
                    };
                }
            } catch {
                // ignore
            }
        }

        next();
    };
}