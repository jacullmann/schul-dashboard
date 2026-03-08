// routes/items.js
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import dayjs from 'dayjs';
import * as db from '../db/db.js';

export default function createItemsRoutes(deps) {
    const router = Router();
    const {
        supabase,
        cloudinary,
        authSecret,
        requireAuth,
        requireTenant,
        validateCsrf,
        sendJSONError,
        validate,
        validateItemCreation,
        withThumb,
        timeLeftColor,
    } = deps;

    const auth = [requireAuth(authSecret, supabase), requireTenant(supabase)];

    // GET /api/items
    router.get('/', ...auth,
        query('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']),
        query('filter').optional().isIn(['old']),
        validate,
        async (req, res) => {
            try {
                const rows = await db.listItems(supabase, req.tenantId, {
                    type: req.query.type, filter: req.query.filter, limit: 100, userId: req.userId,
                });
                res.json(rows.map(row => ({
                    id: row.id, type: row.type, title: row.title, subject: row.subject,
                    description: row.description,
                    images: (row.images || []).map(img => withThumb(img)),
                    dueDate: row.due_date, createdBy: row.created_by,
                    createdByEmail: row.creator?.email || 'Unbekannt',
                    timeColor: timeLeftColor(row.due_date), editorNote: row.editor_note || '',
                })));
            } catch (err) {
                console.error('Error loading items:', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Einträge');
            }
        },
    );

    // GET /api/items/:id
    router.get('/:id', ...auth, param('id').isUUID(), validate, async (req, res) => {
        try {
            const row = await db.findItemById(supabase, req.tenantId, req.params.id);
            if (!row) return sendJSONError(res, 404, 'Eintrag nicht gefunden');
            const creator = await db.findUserById(supabase, row.created_by, 'email');
            res.json({
                id: row.id, type: row.type, title: row.title, subject: row.subject,
                description: row.description,
                images: (row.images || []).map(img => withThumb(img)),
                dueDate: row.due_date, createdBy: row.created_by,
                createdByEmail: creator?.email || 'Unbekannt',
                timeColor: timeLeftColor(row.due_date), editorNote: row.editor_note || '',
            });
        } catch (err) {
            sendJSONError(res, 500, 'Fehler beim Laden des Eintrags');
        }
    });

    // POST /api/items
    router.post('/', ...auth, validateCsrf(),
        [
            body('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']).withMessage('type'),
            body('title').isString().isLength({ min: 1, max: 60 }).withMessage('title'),
            body('subject').isString().isLength({ min: 1, max: 100 }).withMessage('subject'),
            body('description').optional().isString().isLength({ max: 1000 }).withMessage('description'),
            body('images').optional().isArray({ max: 8 }).withMessage('images'),
            body('dueDate').isISO8601().toDate().withMessage('dueDate'),
        ],
        validateItemCreation,
        async (req, res) => {
            try {
                const rawImages = req.body.images || [];
                for (const img of rawImages) {
                    if (!img.publicId) return sendJSONError(res, 400, 'Fehlendes publicId im Bild');
                }
                const images = rawImages.map(img => ({
                    publicId: img.publicId, createdBy: req.userId, metadata: img.metadata || {},
                }));

                const item = await db.createItem(supabase, req.tenantId, {
                    type: req.body.type, title: req.body.title.trim(),
                    subject: req.body.subject.trim(),
                    description: (req.body.description || '').trim(),
                    images, dueDate: req.body.dueDate, createdBy: req.userId,
                });
                await db.logActivity(supabase, req.userId, 'item:create', { id: item.id, type: item.type });
                res.status(201).json({ ok: true, id: item.id });
            } catch (err) {
                console.error('Item creation error:', err);
                sendJSONError(res, 500, 'Fehler beim Erstellen des Eintrags');
            }
        },
    );

    // PATCH /api/items/:id
    router.patch('/:id', ...auth, validateCsrf(),
        param('id').isUUID(),
        body('title').optional().isString().isLength({ min: 2, max: 60 }),
        body('subject').optional().isString().isLength({ min: 2, max: 100 }),
        body('description').optional().isString().isLength({ max: 1000 }),
        body('images').optional().isArray({ max: 12 }),
        body('dueDate').optional().isISO8601().toDate(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.tenantId, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
                if (item.created_by !== req.userId) {
                    return sendJSONError(res, 403, 'Nur der Ersteller kann diesen Eintrag bearbeiten.');
                }

                if (req.body.dueDate) {
                    const due = dayjs(req.body.dueDate);
                    if (due.isBefore(dayjs().subtract(2, 'day'))) return sendJSONError(res, 400, 'Datum liegt zu weit in der Vergangenheit');
                    if (due.isAfter(dayjs().add(365, 'day'))) return sendJSONError(res, 400, 'Datum liegt zu weit in der Zukunft');
                }

                if (req.body.images) {
                    if (req.body.images.length > 12) return sendJSONError(res, 400, 'Max 12 Bilder');
                    const userCount = req.body.images.filter(i => (i.createdBy === req.userId) || !i.createdBy).length;
                    if (userCount > 8) return sendJSONError(res, 400, 'Max 8 eigene Bilder');
                }

                const update = {};
                if (req.body.title !== undefined) update.title = req.body.title;
                if (req.body.subject !== undefined) update.subject = req.body.subject;
                if (req.body.description !== undefined) update.description = req.body.description;
                if (req.body.dueDate !== undefined) update.due_date = req.body.dueDate;
                if (req.body.images !== undefined) {
                    for (const img of req.body.images) {
                        if (!img.publicId) return sendJSONError(res, 400, 'Fehlendes publicId');
                    }
                    update.images = req.body.images.map(img => ({
                        publicId: img.publicId, createdBy: img.createdBy || req.userId, metadata: img.metadata || {},
                    }));
                }

                await db.updateItem(supabase, req.tenantId, item.id, update);
                await db.logActivity(supabase, req.userId, 'item:update', { id: item.id });
                res.json({ ok: true });
            } catch (err) {
                sendJSONError(res, 500, 'Fehler beim Aktualisieren');
            }
        },
    );

    // DELETE /api/items/:id
    router.delete('/:id', ...auth, validateCsrf(), param('id').isUUID(), validate, async (req, res) => {
        try {
            const item = await db.findItemById(supabase, req.tenantId, req.params.id);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            const isSuperadmin = req.user.globalRole === 'superadmin';
            if (!isSuperadmin && item.created_by !== req.userId) {
                return sendJSONError(res, 403, 'Nicht autorisiert.');
            }

            if (item.images?.length > 0) {
                const pids = item.images.map(i => i.publicId).filter(Boolean);
                if (pids.length) {
                    try { await cloudinary.api.delete_resources(pids); } catch (e) { console.error('Cloudinary error', e); }
                }
            }

            await db.deleteItem(supabase, req.tenantId, item.id);
            await db.logActivity(supabase, req.userId, 'item:delete', { id: item.id });
            res.json({ ok: true });
        } catch (err) {
            sendJSONError(res, 500, 'Fehler beim Löschen');
        }
    });

    // PATCH /api/items/:id/note (admin/mod only)
    router.patch('/:id/note',
        requireAuth(authSecret, supabase, ['admin', 'mod']),
        validateCsrf(), param('id').isUUID(),
        body('editorNote').isString().isLength({ max: 2000 }),
        validate, async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.tenantId, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
                const noteContent = req.body.editorNote.trim();
                await db.updateItem(supabase, req.tenantId, item.id, { editor_note: noteContent });
                await db.logActivity(supabase, req.userId, 'item:note:update', { itemId: item.id });
                res.json({ ok: true, editorNote: noteContent });
            } catch (err) {
                sendJSONError(res, 500, 'Fehler beim Speichern');
            }
        },
    );

    // POST /api/items/:id/images
    router.post('/:id/images', ...auth, validateCsrf(),
        param('id').isUUID(), body('image').isObject(), body('image.publicId').isString(), validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.tenantId, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
                const images = item.images || [];
                if (images.length >= 12) return sendJSONError(res, 400, 'Max 12 Bilder');
                const userCount = images.filter(i => i.createdBy === req.userId).length;
                if (userCount >= 8) return sendJSONError(res, 400, 'Max 8 eigene Bilder');

                const newImage = { publicId: req.body.image.publicId, createdBy: req.userId, metadata: req.body.image.metadata || {} };
                images.push(newImage);
                await db.updateItem(supabase, req.tenantId, item.id, { images });
                await db.logActivity(supabase, req.userId, 'item:image:add', { itemId: item.id });
                res.status(201).json({ ok: true, image: withThumb(newImage) });
            } catch (err) {
                sendJSONError(res, 500, 'Fehler beim Hinzufügen');
            }
        },
    );

    // DELETE /api/items/:itemId/images/:publicId
    router.delete('/:itemId/images/:publicId', ...auth, validateCsrf(),
        param('itemId').isUUID(), param('publicId').isString(), validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.tenantId, req.params.itemId);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

                let publicId;
                try { publicId = decodeURIComponent(req.params.publicId); } catch { publicId = req.params.publicId; }

                const images = item.images || [];
                const idx = images.findIndex(i => i.publicId === publicId);
                if (idx === -1) return sendJSONError(res, 404, 'Bild nicht gefunden');

                const image = images[idx];
                const isSuperadmin = req.user.globalRole === 'superadmin';
                const isImageOwner = image.createdBy === req.userId;
                const isItemOwner = item.created_by === req.userId;
                if (!isSuperadmin && !isImageOwner && !isItemOwner) {
                    return sendJSONError(res, 403, 'Nicht autorisiert.');
                }

                try { await cloudinary.uploader.destroy(image.publicId); } catch (e) { console.error('Cloudinary error', e); }

                images.splice(idx, 1);
                await db.updateItem(supabase, req.tenantId, item.id, { images });
                await db.logActivity(supabase, req.userId, 'item:image:delete', { itemId: item.id });
                res.json({ ok: true });
            } catch (err) {
                sendJSONError(res, 500, 'Fehler beim Löschen');
            }
        },
    );

    // POST /api/items/reports
    router.post('/reports',
        requireAuth(authSecret, supabase), validateCsrf(),
        body('itemId').isUUID(), body('itemTitle').isString().isLength({ min: 1, max: 200 }),
        body('category').isIn(['illegal', 'falschinfo']),
        body('reason').optional().isString().isLength({ max: 5000 }),
        validate,
        async (req, res) => {
            try {
                const { itemId, itemTitle, category, reason } = req.body;
                if (category === 'falschinfo' && (!reason || !reason.trim())) {
                    return sendJSONError(res, 400, 'Bitte füge einen Grund hinzu.');
                }
                await db.createReport(supabase, {
                    itemId, itemTitle, category,
                    reason: reason?.trim() || null,
                    reporterId: req.userId, reporterEmail: req.user.email,
                });
                await db.logActivity(supabase, req.userId, 'item:report', { itemId, category });
                res.status(201).json({ ok: true, message: 'Eintrag erfolgreich gemeldet.' });
            } catch (err) {
                sendJSONError(res, 500, 'Server error');
            }
        },
    );

    // POST /api/items/sorgenbox (was /anon/sorgenbox)
    router.post('/sorgenbox',
        requireAuth(authSecret, supabase), validateCsrf(),
        async (req, res) => {
            try {
                const { message } = req.body;
                if (!message?.trim()) return res.status(400).json({ error: 'Nachricht darf nicht leer sein.' });
                const trimmed = message.trim();
                if (trimmed.length > 5000) return res.status(400).json({ error: 'Nachricht zu lang (max 5000 Zeichen)' });
                await db.createSorge(supabase, trimmed);
                res.json({ ok: true });
            } catch (err) {
                sendJSONError(res, 500, 'Server error');
            }
        },
    );

    // POST /api/items/uploads/sign (was /api/uploads/sign)
    router.post('/uploads/sign',
        requireAuth(authSecret, supabase), validateCsrf(),
        async (req, res) => {
            try {
                const timestamp = Math.floor(Date.now() / 1000);
                const signature = cloudinary.utils.api_sign_request(
                    { timestamp, folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben' },
                    process.env.CLOUDINARY_API_SECRET,
                );
                res.json({
                    cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY,
                    timestamp, signature, folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben',
                });
            } catch (err) {
                sendJSONError(res, 500, 'Fehler beim Erstellen der Upload-Signatur');
            }
        },
    );

    return router;
}