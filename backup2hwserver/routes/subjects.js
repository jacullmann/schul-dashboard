// routes/subjects.js
import express from 'express';
import { body, param } from 'express-validator';

import { Subject } from '../models/index.js';
import { requireAdmin, validate } from '../middleware/index.js';

const router = express.Router();

// Get all subjects
router.get('/', async (req, res) => {
    const list = await Subject.find({}).sort({ name: 1 }).lean();
    res.json(list.map(s => s.name));
});

// Create subject
router.post('/',
    requireAdmin,
    body('name').isString().isLength({ min: 2, max: 50 }),
    validate,
    async (req, res) => {
        await Subject.updateOne({ name: req.body.name }, { $set: { name: req.body.name } }, { upsert: true });
        res.status(201).json({ ok: true });
    }
);

// Delete subject
router.delete('/:name', requireAdmin, async (req, res) => {
    await Subject.deleteOne({ name: req.params.name });
    res.json({ ok: true });
});

export default router;