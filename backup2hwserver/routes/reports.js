// routes/reports.js
import express from 'express';
import { body } from 'express-validator';

import { Report } from '../models/index.js';
import { tryAuth, validate } from '../middleware/index.js';
import { sendJSONError, logActivity } from '../utils/index.js';

const router = express.Router();

// Create report
router.post('/',
    tryAuth,
    body('itemId').isMongoId(),
    body('itemTitle').isString().isLength({ min: 1, max: 200 }),
    body('reason').optional().isString().isLength({ max: 1000 }),
    validate,
    async (req, res) => {
        try {
            const { itemId, itemTitle, reason } = req.body;

            const reportData = {
                itemId,
                itemTitle,
                reason: reason || '',
                reportedAt: new Date(),
                reporterId: req.user ? req.user.sub : null,
                reporterEmail: req.user ? req.user.email : 'anonymous'
            };

            await Report.create(reportData);

            if (req.user) {
                await logActivity(req.user.sub, 'item:report', { itemId, reason: !!reason });
            }

            res.status(201).json({ ok: true, message: 'Eintrag erfolgreich gemeldet.' });

        } catch (err) {
            console.error('POST /api/reports error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

export default router;