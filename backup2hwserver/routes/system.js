import { Router } from 'express';
import { generateCsrfToken, verifyCsrfToken } from '../middleware/csrf.js';

export default function createSystemRoutes(deps) {
    const router = Router();
    const { csrfSecret } = deps;

    router.get('/csrf/init', (req, res) => {
        let token = req.cookies['csrf_token'];
        if (!token || !verifyCsrfToken(token, csrfSecret)) {
            token = generateCsrfToken(csrfSecret);
        }
        res.cookie('csrf_token', token, {
            httpOnly: false,
            secure: true,
            path: '/',
            sameSite: 'None',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.json({ ok: true, csrfToken: token });
    });

    router.get('/serverstatus', (req, res) => {
        res.status(200).json({ status: 'good' });
    });

    return router;
}