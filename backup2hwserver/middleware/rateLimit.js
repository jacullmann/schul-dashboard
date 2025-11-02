// middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export const dashboardLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Zu viele Versuche - IP gesperrt. Versuch es in 30 Minuten wieder.' },
    statusCode: 429,
});

export const generalLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
});