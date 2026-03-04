import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import * as db from '../db/db.js';

const DUMMY_HASH = bcrypt.hashSync('__dummy__', 10);

export default function createAppGateRoutes(deps) {
    const router = Router();
    const {
        supabase,
        appGateSecret,
        csrfSecret,
        setAppGateToken,
        clearAppGateToken,
        requireAppGate,
        checkAppGate,
        validateCsrf,
        clearCsrfCookie,
        rotateCsrfToken,
        dashboardLimiter,
        sendJSONError,
        validate,
    } = deps;

    router.post('/login',
        dashboardLimiter,
        validateCsrf(csrfSecret),
        [
            body('groupName').isString().trim().isLength({ min: 1, max: 100 }),
            body('password').isString().isLength({ min: 1 })
        ],
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { groupName, password } = req.body;

            const group = await db.findGroupByName(supabase, groupName);

            const hashToCompare = group?.passcode_hash || DUMMY_HASH;
            const isValid = await bcrypt.compare(password, hashToCompare);
            const isAuthenticated = group && isValid;

            await db.logSecurityEvent(supabase, {
                eventType: 'app_gate_login',
                eventStatus: isAuthenticated ? 'success' : 'failure',
                ip, userAgent: ua,
                metadata: {
                    groupName,
                    groupId: group?.id || null
                },
            });

            if (isAuthenticated) {
                setAppGateToken(res, appGateSecret, {
                    groupId: group.id,
                    groupName: group.name
                });
                const newCsrfToken = rotateCsrfToken(res, csrfSecret);
                return res.json({ ok: true, csrfToken: newCsrfToken });
            } else {
                return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
            }
        }
    );


    router.get('/status',
        checkAppGate(appGateSecret),
        (req, res) => res.json({
            authenticated: req.appGate,
            ...(req.appGateGroup ? { group: req.appGateGroup } : {})
        })
    );

    router.post('/logout',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        async (req, res) => {
            await db.logSecurityEvent(supabase, {
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
