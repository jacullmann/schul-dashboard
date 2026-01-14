import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';

import { setAppGateToken, requireAppGate, clearAppGateToken, checkAppGate } from '../middleware/appAuth.js';
import { validateCsrf, clearCsrfCookie, rotateCsrfToken, generateCsrfToken, verifyCsrfToken } from '../middleware/csrf.js';
import { dashboardLimiter } from '../middleware/rateLimiters.js';
import { sendJSONError, validate } from '../middleware/validation.js';

export default function createAppGateRoutes(deps) {
    const router = Router();
    const {
        supabase,
        appGateSecret,
        csrfSecret
    } = deps;

    // POST /api/app-gate/login
    router.post('/login',
        dashboardLimiter,
        validateCsrf(csrfSecret),
        [
            body('password').isString().isLength({ min: 1 })
        ],
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { password } = req.body;

            const attemptHash = 'Vorübergehend wegen Sicherheitsbedenken ausgesetzt';
            let status = 'failure';
            const DASHBOARD_CHECK_PASSWORD_HASH = process.env.DASHBOARD_CHECK_PASSWORD_HASH;

            const isValid = await bcrypt.compare(password, DASHBOARD_CHECK_PASSWORD_HASH);

            if (isValid) {
                status = 'success';

                setAppGateToken(res, appGateSecret);
                const newCsrfToken = rotateCsrfToken(res, csrfSecret);

                await supabase.from('auth_logs').insert({
                    ip,
                    status,
                    attempt_hash: attemptHash,
                    user_agent: ua
                });

                return res.json({ ok: true, csrfToken: newCsrfToken });
            } else {
                await supabase.from('auth_logs').insert({
                    ip,
                    status,
                    attempt_hash: attemptHash,
                    user_agent: ua
                });
                return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
            }
        }
    );

    // GET /api/app-gate/status
    router.get('/status',
        checkAppGate(appGateSecret),
        (req, res) => {
            res.json({
                authenticated: req.appGate
            });
        }
    );

    // POST /api/app-gate/logout
    router.post('/logout',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        (req, res) => {
            clearAppGateToken(res);
            clearCsrfCookie(res);
            res.json({ ok: true });
        }
    );

    return router;
}