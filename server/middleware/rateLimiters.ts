// middleware/rateLimiters.ts
import rateLimit from 'express-rate-limit';

export const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Zu viele Anfragen. Bitte warte kurz.' },
  statusCode: 429,
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' },
});

export const mfaVerifyLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Zu viele Versuche. Bitte warte kurz.',
  },
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});
