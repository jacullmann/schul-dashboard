// routes/checks.js
import express from 'express';
import { param } from 'express-validator';

import { KeepChecked, Item } from '../models/index.js';
import { requireAuth, validate } from '../middleware/index.js';
import { sendJSONError, logActivity } from '../utils/index.js';

const router = express.Router();

// Get checked items for current user
router.get('/me', requireAuth, async (req, res) => {
    try {
        const docs = await KeepChecked.find({ userId: req.user.sub }).select('itemId -_id').lean();
        const itemIds = docs.map(d => d.itemId.toString());
        res.json({ itemIds });
    } catch (err) {
        console.error('checks/me error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Check an item
router.post('/items/:id/check',
    requireAuth,
    param('id').isMongoId(),
    validate,
    async (req, res) => {
        try {
            const item = await Item.findById(req.params.id);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            await KeepChecked.updateOne(
                { itemId: item._id, userId: req.user.sub },
                { $setOnInsert: { checkedAt: new Date() } },
                { upsert: true }
            );
            await logActivity(req.user.sub, 'item:check', { itemId: item._id });
            res.json({ ok: true });
        } catch (err) {
            console.error('check post error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

// Uncheck an item
router.delete('/items/:id/check',
    requireAuth,
    param('id').isMongoId(),
    validate,
    async (req, res) => {
        try {
            await KeepChecked.deleteOne({ itemId: req.params.id, userId: req.user.sub });
            await logActivity(req.user.sub, 'item:uncheck', { itemId: req.params.id });
            res.json({ ok: true });
        } catch (err) {
            console.error('check delete error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

export default router;