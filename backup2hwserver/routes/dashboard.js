// routes/dashboard.js
import express from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { dashboardLimiter, validate } from '../middleware/index.js';
import { sendJSONError } from '../utils/index.js';
import { supabase } from '../config/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Dashboard check (login)
router.post('/dashboard-check',
    dashboardLimiter,
    body('password').isString().isLength({ min: 1 }),
    validate,
    async (req, res) => {
        const ip = req.ip;
        const ua = req.get('User-Agent') || 'unknown';
        const { password } = req.body;
        const DASHBOARD_SECRETJ = process.env.DASHBOARD_SECRETJ;

        const attemptHash = crypto
            .createHash('sha256')
            .update(password)
            .digest('hex')

        let status = 'failure';

        if (password === DASHBOARD_SECRETJ) {
            status = 'success';
            const token = jwt.sign(
                { role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            await supabase.from('auth_logs').insert({
                ip,
                status,
                attempt_hash: attemptHash,
                user_agent: ua
            });

            return res.json({ ok: true, token });
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

// Protected route example
router.get('/protected', authMiddleware, (req, res) => {
    res.json({ ok: true, message: 'Geheimer Kram' });
});

// Verify all route
router.get('/verifyall', authMiddleware, (req, res) => {
    res.json({ ok: true });
});

export default router;