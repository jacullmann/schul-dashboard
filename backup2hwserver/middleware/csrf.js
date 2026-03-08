// middleware/csrf.js
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function validateCsrf() {
    return (req, res, next) => {
        const method = req.method.toUpperCase();
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next();
        }

        const cookieToken = req.cookies[CSRF_COOKIE_NAME];
        const headerToken = req.headers[CSRF_HEADER_NAME];

        if (!cookieToken || !headerToken) {
            return res.status(403).json({ error: 'CSRF-Token fehlt' });
        }

        // Timing-safe comparison
        if (cookieToken.length !== headerToken.length) {
            return res.status(403).json({ error: 'CSRF-Token ungültig' });
        }

        const isValid = crypto.timingSafeEqual(
            Buffer.from(cookieToken, 'utf8'),
            Buffer.from(headerToken, 'utf8')
        );

        if (!isValid) {
            return res.status(403).json({ error: 'CSRF-Token ungültig' });
        }

        next();
    };
}

export function setCsrfCookie(res, token) {
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: true,
        path: '/',
        sameSite: 'None',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
}

export function clearCsrfCookie(res) {
    res.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        secure: true,
        path: '/',
        sameSite: 'None',
    });
}

export function rotateCsrfToken(res) {
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    return token;
}