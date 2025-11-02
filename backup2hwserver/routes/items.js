// routes/items.js
import express from 'express';
import { body, param, query } from 'express-validator';
import { v2 as cloudinary } from 'cloudinary';
import dayjs from 'dayjs';

import { Item, User } from '../models/index.js';
import { requireAuth, validate, validateItemCreation } from '../middleware/index.js';
import { sendJSONError, timeLeftColor, buildThumbUrl, withThumb, logActivity } from '../utils/index.js';

const router = express.Router();

// Get items list
router.get('/',
    query('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']),
    query('filter').optional().isIn(['old']),
    validate,
    async (req, res) => {
        try {
            const cutOffDate = dayjs().subtract(48, 'hour').toDate();
            let dateQuery = {};

            if (req.query.filter === 'old') {
                dateQuery = { dueDate: { $lt: cutOffDate } };
            } else {
                dateQuery = { dueDate: { $gte: cutOffDate } };
            }

            const list = await Item.find({
                type: req.query.type,
                ...dateQuery
            })
                .populate('createdBy', 'email')
                .sort({ dueDate: req.query.filter === 'old' ? -1 : 1 })
                .limit(500)
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
                    timeColor: timeLeftColor(i.dueDate)
                };
            });

            res.json(normalized);
        } catch (error) {
            console.error('Error loading items:', error);
            sendJSONError(res, 500, 'Fehler beim Laden der Einträge');
        }
    }
);

// Create item
router.post('/',
    requireAuth,
    [
        body('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']).withMessage('type'),
        body('title').isString().isLength({ min: 2, max: 60 }).withMessage('title'),
        body('subject').isString().isLength({ min: 2, max: 40 }).withMessage('subject'),
        body('description').optional().isString().isLength({ max: 1000 }).withMessage('description'),
        body('images').optional().isArray({ max: 12 }).withMessage('images'),
        body('dueDate').isISO8601().toDate().withMessage('dueDate')
    ],
    validateItemCreation,
    async (req, res) => {
        const images = (req.body.images || []).map(img => ({
            url: img.url,
            thumbUrl: buildThumbUrl(img.url),
            publicId: img.publicId,
            createdBy: req.user.sub
        }));

        const doc = await Item.create({
            type: req.body.type,
            title: req.body.title.trim(),
            subject: req.body.subject.trim(),
            description: (req.body.description || '').trim(),
            images,
            dueDate: req.body.dueDate,
            createdBy: req.user.sub
        });

        await logActivity(req.user.sub, 'item:create', { id: doc._id, type: doc.type });
        res.status(201).json({ ok: true, id: doc._id });
    }
);

// Update item
router.patch('/:id',
    requireAuth,
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
        const user = await User.findById(req.user.sub);
        if (!user?.isAdmin && item.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');

        const minDate = dayjs().subtract(2, 'day').startOf('day');
        const maxDate = dayjs().add(365, 'day').endOf('day');

        if (req.body.dueDate) {
            const due = dayjs(req.body.dueDate);
            if (due.isBefore(minDate)) {
                return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Vergangenheit');
            }
            if (due.isAfter(maxDate)) {
                return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Zukunft');
            }
        }

        const update = {};
        for (const k of ['title', 'subject', 'description', 'images', 'dueDate']) {
            if (req.body[k] !== undefined) update[k] = req.body[k];
        }

        if (update.images) {
            update.images = update.images.map(img => ({
                url: img.url,
                thumbUrl: buildThumbUrl(img.url),
                publicId: img.publicId,
                createdBy: img.createdBy || item.createdBy
            }));
        }

        await Item.findByIdAndUpdate(item._id, { $set: update });
        await logActivity(req.user.sub, 'item:update', { id: item._id });
        res.json({ ok: true });
    }
);

// Delete item
router.delete('/:id', requireAuth, async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
    const user = await User.findById(req.user.sub);
    if (!user?.isAdmin && item.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');

    if (item.images && item.images.length > 0) {
        const publicIds = item.images.map(img => img.publicId);
        try {
            await cloudinary.api.delete_resources(publicIds);
        } catch (err) {
            console.error('Cloudinary bulk delete error', err);
        }
    }
    await item.deleteOne();
    await logActivity(req.user.sub, 'item:delete', { id: item._id });
    res.json({ ok: true });
});

// Add image to item
router.post('/:id/images',
    requireAuth,
    param('id').isMongoId(),
    body('image').isObject(),
    body('image.url').isString(),
    body('image.publicId').isString(),
    validate,
    async (req, res) => {
        const item = await Item.findById(req.params.id);
        if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

        const newImage = {
            url: req.body.image.url,
            thumbUrl: buildThumbUrl(req.body.image.url),
            publicId: req.body.image.publicId,
            createdBy: req.user.sub
        };
        item.images.push(newImage);
        await item.save();
        await logActivity(req.user.sub, 'item:image:add', { itemId: item._id, publicId: newImage.publicId });
        res.status(201).json({ ok: true, image: withThumb(newImage) });
    }
);

// Delete image from item
router.delete('/:itemId/images/:publicId',
    requireAuth,
    param('itemId').isMongoId(),
    param('publicId').isString(),
    validate,
    async (req, res) => {
        const item = await Item.findById(req.params.itemId);
        if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

        let publicId;
        try {
            publicId = decodeURIComponent(req.params.publicId);
        } catch {
            publicId = req.params.publicId;
        }

        const imageIndex = item.images.findIndex(img => img.publicId === publicId);
        if (imageIndex === -1) return sendJSONError(res, 404, 'Bild nicht gefunden');

        const image = item.images[imageIndex];
        const user = await User.findById(req.user.sub);

        if (!user?.isAdmin && image.createdBy.toString() !== req.user.sub) {
            return sendJSONError(res, 403, 'Du kanst keine fremden Bilder löschen.');
        }

        try {
            await cloudinary.uploader.destroy(image.publicId);
        } catch (err) {
            console.error('Cloudinary destroy error', err);
        }

        item.images.splice(imageIndex, 1);
        await item.save();

        await logActivity(req.user.sub, 'item:image:delete', { itemId: item._id, publicId: image.publicId });
        res.json({ ok: true });
    }
);

export default router;