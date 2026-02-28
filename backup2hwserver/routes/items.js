import { Router } from 'express';
import { body, param, query } from 'express-validator';
import dayjs from 'dayjs';
import * as db from '../db/db.js';

export default function createItemsRoutes(deps) {
    const router = Router();
    const {
        supabase,
        cloudinary,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        checkUser,
        validateCsrf,
        sendJSONError,
        validate,
        requireAdmin,
        isValidCloudinaryUrl,
        validateItemCreation,
        buildThumbUrl,
        withThumb,
        timeLeftColor,
    } = deps;

    // GET /api/items
    router.get('/',
        requireAppGate(appGateSecret),
        query('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']),
        query('filter').optional().isIn(['old']),
        validate,
        async (req, res) => {
            try {
                const rows = await db.listItems(supabase, {
                    type: req.query.type,
                    filter: req.query.filter,
                    limit: 100,
                });

                const normalized = rows.map(row => {
                    const imgs = (row.images || []).map(img => withThumb(img));
                    return {
                        id: row.id,
                        type: row.type,
                        title: row.title,
                        subject: row.subject,
                        description: row.description,
                        images: imgs,
                        dueDate: row.due_date,
                        createdBy: row.created_by,
                        createdByEmail: row.creator?.email || 'Unbekannt',
                        timeColor: timeLeftColor(row.due_date),
                        editorNote: row.editor_note || '',
                    };
                });
                res.json(normalized);
            } catch (error) {
                console.error('Error loading items:', error);
                sendJSONError(res, 500, 'Fehler beim Laden der Einträge');
            }
        }
    );

    // GET /api/items/:id
    router.get('/:id',
        requireAppGate(appGateSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const row = await db.findItemById(supabase, req.params.id);
                if (!row) return sendJSONError(res, 404, 'Eintrag nicht gefunden');

                // Fetch creator email
                const creator = await db.findUserById(supabase, row.created_by, 'email');
                const imgs = (row.images || []).map(img => withThumb(img));

                res.json({
                    id: row.id,
                    type: row.type,
                    title: row.title,
                    subject: row.subject,
                    description: row.description,
                    images: imgs,
                    dueDate: row.due_date,
                    createdBy: row.created_by,
                    createdByEmail: creator?.email || 'Unbekannt',
                    timeColor: timeLeftColor(row.due_date),
                    editorNote: row.editor_note || '',
                });
            } catch (error) {
                console.error('Error fetching single item:', error);
                sendJSONError(res, 500, 'Fehler beim Laden des Eintrags');
            }
        }
    );

    // POST /api/items
    router.post('/',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        [
            body('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']).withMessage('type'),
            body('title').isString().isLength({ min: 1, max: 60 }).withMessage('title'),
            body('subject').isString().isLength({ min: 1, max: 40 }).withMessage('subject'),
            body('description').optional().isString().isLength({ max: 1000 }).withMessage('description'),
            body('images').optional().isArray({ max: 8 }).withMessage('images'),
            body('dueDate').isISO8601().toDate().withMessage('dueDate'),
        ],
        validateItemCreation,
        async (req, res) => {
            try {
                const title = req.body.title.trim();
                const subject = req.body.subject.trim();
                const description = (req.body.description || '').trim();

                const rawImages = req.body.images || [];
                for (const img of rawImages) {
                    if (!isValidCloudinaryUrl(img.url)) {
                        return sendJSONError(res, 400, 'Ungültige Cloudinary-Bild-URL');
                    }
                }
                const images = rawImages.map(img => ({
                    url: img.url,
                    thumbUrl: buildThumbUrl(img.url),
                    publicId: img.publicId,
                    createdBy: req.user.sub,
                }));

                const item = await db.createItem(supabase, {
                    type: req.body.type,
                    title,
                    subject,
                    description,
                    images,
                    dueDate: req.body.dueDate,
                    createdBy: req.user.sub,
                });

                await db.logActivity(supabase, req.user.sub, 'item:create', { id: item.id, type: item.type });

                res.status(201).json({ ok: true, id: item.id });
            } catch (error) {
                console.error('Item creation error:', error);
                sendJSONError(res, 500, 'Fehler beim Erstellen des Eintrags');
            }
        }
    );

    // PATCH /api/items/:id
    router.patch('/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        body('title').optional().isString().isLength({ min: 2, max: 60 }),
        body('subject').optional().isString().isLength({ min: 2, max: 40 }),
        body('description').optional().isString().isLength({ max: 1000 }),
        body('images').optional().isArray({ max: 12 }),
        body('dueDate').optional().isISO8601().toDate(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
                if (item.created_by !== req.user.sub) {
                    return sendJSONError(res, 403, 'Nur der Ersteller kann diesen Eintrag bearbeiten.');
                }

                const minDate = dayjs().subtract(2, 'day').startOf('day');
                const maxDate = dayjs().add(365, 'day').endOf('day');
                if (req.body.dueDate) {
                    const due = dayjs(req.body.dueDate);
                    if (due.isBefore(minDate)) return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Vergangenheit');
                    if (due.isAfter(maxDate)) return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Zukunft');
                }

                if (req.body.images) {
                    const PER_USER_MAX_IMAGES = 8;
                    const TOTAL_MAX_IMAGES = 12;

                    if (req.body.images.length > TOTAL_MAX_IMAGES) {
                        return sendJSONError(res, 400, `Das Limit von ${TOTAL_MAX_IMAGES} Bildern pro Eintrag ist erreicht.`);
                    }
                    const userImageCount = req.body.images.filter(
                        img => (img.createdBy && img.createdBy === req.user.sub) || !img.createdBy
                    ).length;
                    if (userImageCount > PER_USER_MAX_IMAGES) {
                        return sendJSONError(res, 400, `Du kannst maximal ${PER_USER_MAX_IMAGES} Bilder selbst zu einem Eintrag hinzufügen.`);
                    }
                }

                const update = {};
                if (req.body.title !== undefined) update.title = req.body.title;
                if (req.body.subject !== undefined) update.subject = req.body.subject;
                if (req.body.description !== undefined) update.description = req.body.description;
                if (req.body.dueDate !== undefined) update.due_date = req.body.dueDate;
                if (req.body.images !== undefined) {
                    for (const img of req.body.images) {
                        if (!isValidCloudinaryUrl(img.url)) {
                            return sendJSONError(res, 400, 'Ungültige Cloudinary-Bild-URL');
                        }
                    }
                    update.images = req.body.images.map(img => ({
                        url: img.url,
                        thumbUrl: buildThumbUrl(img.url),
                        publicId: img.publicId,
                        createdBy: img.createdBy || req.user.sub,
                    }));
                }

                await db.updateItem(supabase, item.id, update);
                await db.logActivity(supabase, req.user.sub, 'item:update', { id: item.id });
                res.json({ ok: true });
            } catch (error) {
                console.error('PATCH /api/items/:id error:', error);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren des Eintrags');
            }
        }
    );

    // DELETE /api/items/:id
    router.delete('/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
                if (!req.user.isAdmin && item.created_by !== req.user.sub) {
                    return sendJSONError(res, 403, 'Nicht autorisiert.');
                }

                // Delete Cloudinary images
                if (item.images && item.images.length > 0) {
                    const publicIds = item.images.map(img => img.publicId).filter(Boolean);
                    if (publicIds.length > 0) {
                        try {
                            await cloudinary.api.delete_resources(publicIds);
                        } catch (err) {
                            console.error('Cloudinary bulk delete error', err);
                        }
                    }
                }

                // CASCADE handles keep_checked and pinned_items
                await db.deleteItem(supabase, item.id);
                await db.logActivity(supabase, req.user.sub, 'item:delete', { id: item.id });
                res.json({ ok: true });
            } catch (error) {
                console.error('DELETE /api/items/:id error:', error);
                sendJSONError(res, 500, 'Fehler beim Löschen des Eintrags');
            }
        }
    );

    // PATCH /api/items/:id/note (nur Admins)
    router.patch('/:id/note',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireAdmin,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        body('editorNote').isString().isLength({ max: 2000 }),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Eintrag nicht gefunden');

                const noteContent = req.body.editorNote.trim();
                await db.updateItem(supabase, item.id, { editor_note: noteContent });
                await db.logActivity(supabase, req.user.sub, 'item:note:update', {
                    itemId: item.id,
                    noteLength: noteContent.length,
                });
                res.json({ ok: true, editorNote: noteContent });
            } catch (error) {
                console.error('PATCH /api/items/:id/note error:', error);
                sendJSONError(res, 500, 'Fehler beim Speichern der Anmerkung');
            }
        }
    );

    // POST /api/items/:id/images
    router.post('/:id/images',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        body('image').isObject(),
        body('image.url').isString(),
        body('image.publicId').isString(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

                const TOTAL_MAX_IMAGES = 12;
                const PER_USER_MAX_IMAGES = 8;
                const images = item.images || [];

                if (images.length >= TOTAL_MAX_IMAGES) {
                    return sendJSONError(res, 400, `Das Limit von ${TOTAL_MAX_IMAGES} Bildern pro Eintrag ist erreicht.`);
                }
                const userImageCount = images.filter(
                    img => img.createdBy && img.createdBy === req.user.sub
                ).length;
                if (userImageCount >= PER_USER_MAX_IMAGES) {
                    return sendJSONError(res, 400, `Du hast dein Limit von ${PER_USER_MAX_IMAGES} Bildern für diesen Eintrag erreicht.`);
                }
                if (!isValidCloudinaryUrl(req.body.image.url)) {
                    return sendJSONError(res, 400, 'Ungültige Cloudinary-Bild-URL');
                }

                const newImage = {
                    url: req.body.image.url,
                    thumbUrl: buildThumbUrl(req.body.image.url),
                    publicId: req.body.image.publicId,
                    createdBy: req.user.sub,
                };
                images.push(newImage);
                await db.updateItem(supabase, item.id, { images });
                await db.logActivity(supabase, req.user.sub, 'item:image:add', {
                    itemId: item.id,
                    publicId: newImage.publicId,
                });
                res.status(201).json({ ok: true, image: withThumb(newImage) });
            } catch (error) {
                console.error('POST /api/items/:id/images error:', error);
                sendJSONError(res, 500, 'Fehler beim Hinzufügen des Bildes');
            }
        }
    );

    // DELETE /api/items/:itemId/images/:publicId
    router.delete('/:itemId/images/:publicId',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('itemId').isUUID(),
        param('publicId').isString(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.params.itemId);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

                let publicId;
                try { publicId = decodeURIComponent(req.params.publicId); } catch { publicId = req.params.publicId; }

                const images = item.images || [];
                const imageIndex = images.findIndex(img => img.publicId === publicId);
                if (imageIndex === -1) return sendJSONError(res, 404, 'Bild nicht gefunden');

                const image = images[imageIndex];
                const isAdmin = req.user.isAdmin;
                const isImageOwner = image.createdBy && image.createdBy === req.user.sub;
                const isItemOwner = item.created_by === req.user.sub;
                if (!isAdmin && !isImageOwner && !isItemOwner) {
                    return sendJSONError(res, 403, 'Du kannst dieses Bild nicht löschen.');
                }

                try {
                    await cloudinary.uploader.destroy(image.publicId);
                } catch (err) {
                    console.error('Cloudinary destroy error', err);
                }

                images.splice(imageIndex, 1);
                await db.updateItem(supabase, item.id, { images });
                await db.logActivity(supabase, req.user.sub, 'item:image:delete', {
                    itemId: item.id,
                    publicId: image.publicId,
                });
                res.json({ ok: true });
            } catch (error) {
                console.error('DELETE /api/items/:itemId/images/:publicId error:', error);
                sendJSONError(res, 500, 'Fehler beim Löschen des Bildes');
            }
        }
    );

    // POST /api/items/reports
    router.post('/reports',
        requireAppGate(appGateSecret),
        checkUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        body('itemId').isUUID(),
        body('itemTitle').isString().isLength({ min: 1, max: 200 }),
        body('category').isIn(['illegal', 'falschinfo']),
        body('reason').optional().isString().isLength({ max: 5000 }),
        validate,
        async (req, res) => {
            try {
                const { itemId, itemTitle, category, reason } = req.body;

                if (category === 'falschinfo' && (!reason || reason.trim().length === 0)) {
                    return sendJSONError(res, 400, 'Bitte füge einen Grund hinzu.');
                }

                await db.createReport(supabase, {
                    itemId,
                    itemTitle,
                    category,
                    reason: reason ? reason.trim() : null,
                    reporterId: req.user ? req.user.sub : null,
                    reporterEmail: req.user ? req.user.email : 'anonymous',
                });

                if (req.user) {
                    await db.logActivity(supabase, req.user.sub, 'item:report', {
                        itemId,
                        category,
                        hasReason: !!reason,
                    });
                }

                res.status(201).json({ ok: true, message: 'Eintrag erfolgreich gemeldet.' });
            } catch (err) {
                console.error('POST /api/items/reports error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    return router;
}