import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken(secret) {
    const randomValue = crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(randomValue);
    const signature = hmac.digest('hex');
    return `${randomValue}.${signature}`;
}

export function verifyCsrfToken(token, secret) {
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [randomValue, signature] = parts;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(randomValue);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

export function setCsrfCookie(csrfSecret) {
    return (req, res, next) => {
        if (!req.cookies[CSRF_COOKIE_NAME]) {
            const token = generateCsrfToken(csrfSecret);
            res.setHeader('Set-Cookie',
                `${CSRF_COOKIE_NAME}=${token}; ` +
                `Domain=.schul-dashboard.com; ` +
                `Path=/; ` +
                `Max-Age=${30 * 24 * 60 * 60}; ` +
                `Secure; ` +
                `SameSite=None; ` +
                `Partitioned`
            );
        }
        next();
    };
}


export function validateCsrf(csrfSecret) {
    return (req, res, next) => {
        const method = req.method.toUpperCase();

        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next();
        }

        const cookieToken = req.cookies[CSRF_COOKIE_NAME];
        const headerToken = req.headers[CSRF_HEADER_NAME];

        if (!cookieToken || !headerToken) {
            return res.status(403).json({
                error: 'CSRF-Token fehlt'
            });
        }

        if (cookieToken !== headerToken) {
            return res.status(403).json({
                error: 'CSRF-Token ungültig'
            });
        }

        if (!verifyCsrfToken(cookieToken, csrfSecret)) {
            return res.status(403).json({
                error: 'CSRF-Token ungültig'
            });
        }

        next();
    };
}

export function clearCsrfCookie(res) {
    res.setHeader('Set-Cookie',
        `${CSRF_COOKIE_NAME}=; ` +
        `Domain=.schul-dashboard.com; ` +
        `Path=/; ` +
        `Max-Age=0; ` +
        `Secure; ` +
        `SameSite=None; ` +
        `Partitioned`
    );
}

export function rotateCsrfToken(res, csrfSecret) {
    const token = generateCsrfToken(csrfSecret);
    res.setHeader('Set-Cookie',
        `${CSRF_COOKIE_NAME}=${token}; ` +
        `Domain=.schul-dashboard.com; ` +
        `Path=/; ` +
        `Max-Age=${30 * 24 * 60 * 60}; ` +
        `Secure; ` +
        `SameSite=None; ` +
        `Partitioned`
    );
    return token;
}