// routes/system.ts
import { Router } from 'express';
import { generateCsrfToken } from '../middleware/csrf.js';
export default function createSystemRoutes(_deps) {
    const router = Router();
    router.get('/csrf/init', (_req, res) => {
        const token = generateCsrfToken();
        res.cookie('csrf_token', token, {
            httpOnly: false,
            secure: true,
            path: '/',
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.json({ ok: true, csrfToken: token });
    });
    router.get('/serverstatus', (_req, res) => {
        res.status(200).json({ status: 'good' });
    });
    return router;
}
//# sourceMappingURL=system.js.map