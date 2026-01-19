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

            const DASHBOARD_CHECK_PASSWORD_HASH = process.env.DASHBOARD_CHECK_PASSWORD_HASH;
            const isValid = await bcrypt.compare(password, DASHBOARD_CHECK_PASSWORD_HASH);

            const logEntry = {
                event_type: 'app_gate_login',
                event_status: isValid ? 'success' : 'failure',
                ip_address: ip,
                user_agent: ua,
                metadata: {}
            };

            try {
                await supabase.from('security_events').insert(logEntry);
            } catch (logError) {
                console.error('Failed to log security event:', logError);
            }

            if (isValid) {
                setAppGateToken(res, appGateSecret);
                const newCsrfToken = rotateCsrfToken(res, csrfSecret);
                return res.json({ ok: true, csrfToken: newCsrfToken });
            } else {
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
        checkAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';

            // Logout-Event loggen
            try {
                await supabase.from('security_events').insert({
                    event_type: 'app_gate_logout',
                    event_status: 'success',
                    ip_address: ip,
                    user_agent: ua,
                    metadata: {}
                });
            } catch (logError) {
                console.error('Failed to log logout event:', logError);
            }

            clearAppGateToken(res);
            clearCsrfCookie(res);
            res.json({ ok: true });
        }
    );

    return router;
}