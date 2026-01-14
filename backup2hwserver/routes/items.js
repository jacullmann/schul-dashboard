import { Router } from 'express';
import { body, param, query } from 'express-validator';
import dayjs from 'dayjs';

export default function createItemsRoutes(deps) {
    const router = Router();
    const {
        models,
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
        timeLeftColor
    } = deps;

    const { User, BannedUser, Item, KeepChecked, Report } = models;

    // GET /api/items
    router.get('/',
        requireAppGate(appGateSecret),
        query('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']),
        query('filter').optional().isIn(['old']),
        validate,
        async (req, res) => {
            try {
                const cutOffDate = dayjs().subtract(24, 'hour').toDate();
                let dateQuery = {};
                if (req.query.filter === 'old') dateQuery = { dueDate: { $lt: cutOffDate } };
                else dateQuery = { dueDate: { $gte: cutOffDate } };
                const list = await Item.find({ type: req.query.type, ...dateQuery })
                    .populate('createdBy', 'email')
                    .sort({ dueDate: req.query.filter === 'old' ? -1 : 1 })
                    .limit(100)
                    .lean();
                const normalized = list.map(i => {
                    const imgs = (i.images || []).map(img => withThumb(img));
                    const createdById = i.createdBy?._id?.toString() || i.createdBy?.toString();
                    return {
                        id: i._id.toString(),
                        type: i.type,
                        title: i.title,
                        subject: i.subject,
                        description: i.description,
                        images: imgs,
                        dueDate: i.dueDate,
                        createdBy: createdById,
                        createdByEmail: i.createdBy?.email || 'Unbekannt',
                        timeColor: timeLeftColor(i.dueDate),
                        editorNote: i.editorNote || ''
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
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const item = await Item.findById(req.params.id)
                    .populate('createdBy', 'email')
                    .lean();

                if (!item) {
                    return sendJSONError(res, 404, 'Eintrag nicht gefunden');
                }

                const imgs = (item.images || []).map(img => withThumb(img));
                const createdById = item.createdBy?._id?.toString() || item.createdBy?.toString();

                const normalized = {
                    id: item._id.toString(),
                    type: item.type,
                    title: item.title,
                    subject: item.subject,
                    description: item.description,
                    images: imgs,
                    dueDate: item.dueDate,
                    createdBy: createdById,
                    createdByEmail: item.createdBy?.email || 'Unbekannt',
                    timeColor: timeLeftColor(item.dueDate),
                    editorNote: item.editorNote || ''
                };

                res.json(normalized);
            } catch (error) {
                console.error('Error fetching single item:', error);
                sendJSONError(res, 500, 'Fehler beim Laden des Eintrags');
            }
        }
    );

    // POST /api/items
    router.post('/',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        [
            body('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']).withMessage('type'),
            body('title').isString().isLength({ min: 2, max: 60 }).withMessage('title'),
            body('subject').isString().isLength({ min: 2, max: 40 }).withMessage('subject'),
            body('description').optional().isString().isLength({ max: 1000 }).withMessage('description'),
            body('images').optional().isArray({ max: 8 }).withMessage('images'),
            body('dueDate').isISO8601().toDate().withMessage('dueDate')
        ],
        validateItemCreation,
        async (req, res) => {
            try {
                const Title = req.body.title.trim();
                const Subject = req.body.subject.trim();
                const Description = (req.body.description || '').trim();

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
                    createdBy: req.user.sub
                }));

                const doc = await Item.create({
                    type: req.body.type,
                    title: Title,
                    subject: Subject,
                    description: Description,
                    images,
                    dueDate: req.body.dueDate,
                    createdBy: req.user.sub
                });

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: { activity: { at: new Date(), type: 'item:create', meta: { id: doc._id, type: doc.type } } }
                });

                res.status(201).json({ ok: true, id: doc._id });
            } catch (error) {
                console.error('Item creation error:', error);
                sendJSONError(res, 500, 'Fehler beim Erstellen des Eintrags');
            }
        }
    );

    // PATCH /api/items/:id
    router.patch('/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        body('title').optional().isString().isLength({ min: 2, max: 60 }),
        body('subject').optional().isString().isLength({ min: 2, max: 40 }),
        body('description').optional().isString().isLength({ max: 1000 }),
        body('images').optional().isArray({ max: 12 }),
        body('dueDate').optional().isISO8601().toDate(),
        validate,
        async (req, res) => {
            const item = await Item.findById(req.params.id);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            if (item.createdBy.toString() !== req.user.sub) {
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
                    img => (img.createdBy && img.createdBy.toString() === req.user.sub) ||
                        !img.createdBy
                ).length;

                if (userImageCount > PER_USER_MAX_IMAGES) {
                    return sendJSONError(res, 400, `Du kannst maximal ${PER_USER_MAX_IMAGES} Bilder selbst zu einem Eintrag hinzufügen.`);
                }
            }

            const update = {};
            for (const k of ['title', 'subject', 'description', 'images', 'dueDate']) {
                if (req.body[k] !== undefined) update[k] = req.body[k];
            }
            if (update.images) {
                for (const img of update.images) {
                    if (!isValidCloudinaryUrl(img.url)) {
                        return sendJSONError(res, 400, 'Ungültige Cloudinary-Bild-URL');
                    }
                }
                update.images = update.images.map(img => ({
                    url: img.url,
                    thumbUrl: buildThumbUrl(img.url),
                    publicId: img.publicId,
                    createdBy: img.createdBy || req.user.sub
                }));
            }
            await Item.findByIdAndUpdate(item._id, { $set: update });
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:update', meta: { id: item._id } } } });
            res.json({ ok: true });
        }
    );

    // DELETE /api/items/:id
    router.delete('/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            const item = await Item.findById(req.params.id);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            if (!req.user.isAdmin && item.createdBy.toString() !== req.user.sub) {
                return sendJSONError(res, 403, 'Nicht autorisiert.');
            }
            if (item.images && item.images.length > 0) {
                const publicIds = item.images.map(img => img.publicId);
                try {
                    await cloudinary.api.delete_resources(publicIds);
                } catch (err) {
                    console.error('Cloudinary bulk delete error', err);
                }
            }
            await KeepChecked.deleteMany({ itemId: item._id });
            await item.deleteOne();
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:delete', meta: { id: item._id } } } });
            res.json({ ok: true });
        }
    );

    // PATCH /api/items/:id/note (nur Admins)
    router.patch('/:id/note',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin,
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        body('editorNote').isString().isLength({ max: 2000 }),
        validate,
        async (req, res) => {
            try {
                const item = await Item.findById(req.params.id);
                if (!item) return sendJSONError(res, 404, 'Eintrag nicht gefunden');

                const noteContent = req.body.editorNote.trim();

                await Item.findByIdAndUpdate(item._id, {
                    $set: { editorNote: noteContent }
                });

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'item:note:update',
                            meta: {
                                itemId: item._id,
                                noteLength: noteContent.length
                            }
                        }
                    }
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
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        body('image').isObject(),
        body('image.url').isString(),
        body('image.publicId').isString(),
        validate,
        async (req, res) => {
            const item = await Item.findById(req.params.id);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            const TOTAL_MAX_IMAGES = 12;
            const PER_USER_MAX_IMAGES = 8;

            if (item.images.length >= TOTAL_MAX_IMAGES) {
                return sendJSONError(res, 400, `Das Limit von ${TOTAL_MAX_IMAGES} Bildern pro Eintrag ist erreicht.`);
            }

            const userImageCount = item.images.filter(
                img => img.createdBy && img.createdBy.toString() === req.user.sub
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
                createdBy: req.user.sub
            };
            item.images.push(newImage);
            await item.save();
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:image:add', meta: { itemId: item._id, publicId: newImage.publicId } } } });
            res.status(201).json({ ok: true, image: withThumb(newImage) });
        }
    );

    // DELETE /api/items/:itemId/images/:publicId
    router.delete('/:itemId/images/:publicId',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('itemId').isMongoId(),
        param('publicId').isString(),
        validate,
        async (req, res) => {
            const item = await Item.findById(req.params.itemId);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            let publicId;
            try { publicId = decodeURIComponent(req.params.publicId); } catch { publicId = req.params.publicId; }
            const imageIndex = item.images.findIndex(img => img.publicId === publicId);
            if (imageIndex === -1) return sendJSONError(res, 404, 'Bild nicht gefunden');
            const image = item.images[imageIndex];
            const isAdmin = req.user.isAdmin;
            const isImageOwner = image.createdBy && image.createdBy.toString() === req.user.sub;
            const isItemOwner = item.createdBy.toString() === req.user.sub;
            if (!isAdmin && !isImageOwner && !isItemOwner) {
                return sendJSONError(res, 403, 'Du kannst dieses Bild nicht löschen.');
            }
            try {
                await cloudinary.uploader.destroy(image.publicId);
            } catch (err) {
                console.error('Cloudinary destroy error', err);
            }
            item.images.splice(imageIndex, 1);
            await item.save();
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:image:delete', meta: { itemId: item._id, publicId: image.publicId } } } });
            res.json({ ok: true });
        }
    );

    // POST /api/items/reports (war /api/reports)
    router.post('/reports',
        requireAppGate(appGateSecret),
        checkUser(userSecret, User),
        validateCsrf(csrfSecret),
        body('itemId').isMongoId(),
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

                const reportData = {
                    itemId,
                    itemTitle,
                    category,
                    reason: reason ? reason.trim() : null,
                    reportedAt: new Date(),
                    reporterId: req.user ? req.user.sub : null,
                    reporterEmail: req.user ? req.user.email : 'anonymous'
                };
                await Report.create(reportData);

                if (req.user) {
                    await User.findByIdAndUpdate(req.user.sub, {
                        $push: {
                            activity: {
                                at: new Date(),
                                type: 'item:report',
                                meta: {
                                    itemId,
                                    category,
                                    hasReason: !!reason
                                }
                            }
                        }
                    });
                }
                res.status(201).json({
                    ok: true,
                    message: 'Eintrag erfolgreich gemeldet.'
                });
            } catch (err) {
                console.error('POST /api/items/reports error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    return router;
}