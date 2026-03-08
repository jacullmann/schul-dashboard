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

        // Timing-safe comparison using fixed-length hashes to prevent length-based side-channel attacks.
        // We hash both tokens and compare the hashes to ensure the comparison always takes the same
        // amount of time regardless of the actual token lengths.
        const cookieTokenBuffer = Buffer.from(cookieToken, 'utf8');
        const headerTokenBuffer = Buffer.from(headerToken, 'utf8');

        const cookieHash = crypto.createHash('sha256').update(cookieTokenBuffer).digest();
        const headerHash = crypto.createHash('sha256').update(headerTokenBuffer).digest();

        const isValid = crypto.timingSafeEqual(cookieHash, headerHash) &&
                        cookieToken.length === headerToken.length;

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