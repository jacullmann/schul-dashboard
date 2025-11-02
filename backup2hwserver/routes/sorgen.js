// routes/sorgen.js
import express from 'express';
import { param } from 'express-validator';

import { Sorgen } from '../models/index.js';
import { requireAdmin, validate } from '../middleware/index.js';
import { sendJSONError } from '../utils/index.js';

const router = express.Router();

// Submit sorgen
router.post('/anon/sorgenbox', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message fehlt' });
        }

        await Sorgen.create({
            message,
            createdAt: new Date()
        });

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Get sorgen (admin only)
router.get('/anon/sorgenfind', requireAdmin, async (req, res) => {
    try {
        const sorgen = await Sorgen.find({})
            .sort({ createdAt: -1})
            .limit(100)

        res.json(sorgen);
    } catch (err) {
        console.error('GET /anon/sorgenfind error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Delete sorgen (admin only)
router.delete('/anon/sorgenfind/:id',
    requireAdmin,
    param('id').isMongoId(),
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;

            const deletedSorge = await Sorgen.findByIdAndDelete(id);

            if (!deletedSorge) {
                return sendJSONError(res, 404, 'Sorgen-Eintrag nicht gefunden');
            }

            res.json({ ok: true, message: 'Sorgen-Eintrag erfolgreich gelöscht' });
        } catch (err) {
            console.error('DELETE /anon/sorgenfind/:id error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    }
);

export default router;