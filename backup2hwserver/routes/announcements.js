// routes/announcements.js
import express from 'express';
import { body, param } from 'express-validator';

import { Announcement, User } from '../models/index.js';
import { requireAuth, validate } from '../middleware/index.js';
import { sendJSONError, logActivity } from '../utils/index.js';

const router = express.Router();

// Get announcements
router.get('/', async (req, res) => {
    const list = await Announcement.find({}).sort({ createdAt: -1 }).limit(5).lean();
    res.json(list);
});

// Create announcement
router.post('/',
    requireAuth,
    body('title').isString().isLength({ min: 2 }),
    body('content').isString().isLength({ min: 2 }),
    body('color').optional().isIn(['info', 'warn', 'danger']),
    validate,
    async (req, res) => {
        const user = await User.findById(req.user.sub);
        if (!user?.isAdmin) return sendJSONError(res, 403, 'Forbidden');
        const doc = await Announcement.create({
            title: req.body.title,
            content: req.body.content,
            color: req.body.color || 'warn',
            createdBy: req.user.sub
        });
        await logActivity(req.user.sub, 'announcement:create', { id: doc._id });
        res.status(201).json(doc);
    }
);

// Delete announcement
router.delete('/:id', requireAuth, async (req, res) => {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return sendJSONError(res, 404, 'Nicht gefunden');
    const user = await User.findById(req.user.sub);
    if (!user?.isAdmin && ann.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');
    await ann.deleteOne();
    await logActivity(req.user.sub, 'announcement:delete', { id: ann._id });
    res.json({ ok: true });
});

export default router;