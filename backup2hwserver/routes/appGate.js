import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';

import { setAppGateToken, requireAppGate, clearAppGateToken, checkAppGate } from '../middleware/appAuth.js';
import { validateCsrf, clearCsrfCookie, rotateCsrfToken } from '../middleware/csrf.js';
import { dashboardLimiter } from '../middleware/rateLimiters.js';
import { sendJSONError, validate } from '../middleware/validation.js';
import { logSecurityEvent } from '../db/db.js';

export default function createAppGateRoutes(deps) {
    const router = Router();
    const { supabase, appGateSecret, csrfSecret } = deps;

    router.post('/login',
        dashboardLimiter,
        validateCsrf(csrfSecret),
        [body('password').isString().isLength({ min: 1 })],
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { password } = req.body;

            const isValid = await bcrypt.compare(password, process.env.DASHBOARD_CHECK_PASSWORD_HASH);

            await logSecurityEvent(supabase, {
                eventType: 'app_gate_login',
                eventStatus: isValid ? 'success' : 'failure',
                ip, userAgent: ua, metadata: {},
            });

            if (isValid) {
                setAppGateToken(res, appGateSecret);
                const newCsrfToken = rotateCsrfToken(res, csrfSecret);
                return res.json({ ok: true, csrfToken: newCsrfToken });
            } else {
                return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
            }
        }
    );

    router.get('/status',
        checkAppGate(appGateSecret),
        (req, res) => res.json({ authenticated: req.appGate })
    );

    router.post('/logout',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        async (req, res) => {
            await logSecurityEvent(supabase, {
                eventType: 'app_gate_logout',
                eventStatus: 'success',
                ip: req.ip,
                userAgent: req.get('User-Agent') || 'unknown',
                metadata: {},
            });

            clearAppGateToken(res);
            clearCsrfCookie(res);
            res.json({ ok: true });
        }
    );

    return router;
}