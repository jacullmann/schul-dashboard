import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { buildThumbUrl, withThumb, timeLeftColor } from './models.js';

export default function registerRoutes(app, deps) {
    const {
        mongoose,
        models,
        supabase,
        cloudinary,
        sgClient,
        geminiModel,
        sendgridConfigured,
        sendgridFrom,
        jwtSecret,
        dashboardSecret
    } = deps;

    const {
        User,
        BannedUser,
        Verification,
        Subject,
        Announcement,
        Item,
        KeepChecked,
        Report,
        Sorgen,
        PasswordReset,
        EncryptedTodo
    } = models;

    function sendJSONError(res, status, msg, errors) {
        return res.status(status).json({ error: msg, errors });
    }

    function validate(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return sendJSONError(res, 400, 'Validation error', errors.array());
        next();
    }

    function tryAuth(req, res, next) {
        const header = req.headers.authorization;
        if (header) {
            const token = header.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, jwtSecret);
                    req.user = decoded;
                } catch {
                    req.user = null;
                }
            }
        }
        next();
    }

    function requireAuth(req, res, next) {
        const hdr = req.headers.authorization || '';
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
        if (!token) return sendJSONError(res, 401, 'Unauthorized');
        try {
            const payload = jwt.verify(token, jwtSecret);
            req.user = payload;
            (async () => {
                const isBanned = await BannedUser.findOne({ userId: payload.sub }).lean();
                if (isBanned) return sendJSONError(res, 401, 'Dein Account ist gesperrt.');
                next();
            })();
        } catch {
            return sendJSONError(res, 401, 'Unauthorized');
        }
    }

    async function requireAdmin(req, res, next) {
        requireAuth(req, res, async () => {
            const user = await User.findById(req.user.sub);
            if (!user?.isAdmin) return sendJSONError(res, 403, 'Forbidden');
            next();
        });
    }

    const dashboardLimiter = rateLimit({
        windowMs: 30 * 60 * 1000,
        max: 15,
        standardHeaders: true,
        legacyHeaders: false,
        message: { ok: false, error: 'Zu viele Versuche - IP gesperrt. Versuch es in 30 Minuten wieder.' },
        statusCode: 429,
    });

    function validateItemCreation(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMap = {
                'type': 'Ungültiger Eintrag',
                'title': 'Passe den Titel an (2-60 Zeichen)',
                'subject': 'Passe das Fach an (2-40 Zeichen)',
                'description': 'Die Beschreibung ist zu lang',
                'images': 'Du kannst maximal 8 Bilder selbst hochladen',
                'dueDate': 'Ungültiges Datumsformat'
            };
            const firstError = errors.array()[0];
            const fieldName = firstError.param;
            const userFriendlyMessage = errorMap[fieldName] || `Ungültiger Wert für ${fieldName}`;
            return sendJSONError(res, 400, userFriendlyMessage, errors.array());
        }

        const { dueDate } = req.body;
        const now = dayjs();
        if (dayjs(dueDate).isBefore(now.subtract(2, 'day'))) {
            return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Vergangenheit');
        } else if (dayjs(dueDate).isAfter(now.add(365, 'day'))) {
            return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Zukunft');
        }
        next();
    }

    async function sendVerificationEmail(to, verifyUrl) {
        if (!sendgridConfigured) throw new Error('SendGrid nicht konfiguriert');
        const msg = {
            to,
            from: sendgridFrom,
            subject: 'Bitte E-Mail bestätigen',
            html: `<p>Hallo,</p><p>Bitte bestätige deine E-Mail durch Klick auf diesen Link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Der Link ist 48 Stunden gültig.</p>`
        };
        return sgClient.send(msg);
    }

    async function sendPasswordResetEmail(to, code) {
        if (!sendgridConfigured) throw new Error('SendGrid nicht konfiguriert');
        const msg = {
            to,
            from: sendgridFrom,
            subject: 'Passwort zurücksetzen — Dein Bestätigungscode',
            html: `<p>Hallo,</p><p>Dein Passwort-Zurücksetz-Code: <strong>${code}</strong></p><p>Dieser Code ist 30 Minuten gültig.</p>`
        };
        return sgClient.send(msg);
    }

    app.post('/api/auth/register',
        body('email').isEmail(),
        body('password').isString().isLength({ min: 8 }),
        validate,
        async (req, res) => {
            const { email, password } = req.body;
            const exists = await User.findOne({ email: email.toLowerCase() });
            if (exists) return sendJSONError(res, 400, 'E-Mail bereits registriert');
            const passwordHash = await bcrypt.hash(password, 12);
            const user = await User.create({ email: email.toLowerCase(), passwordHash, emailVerified: false });
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = dayjs().add(2, 'day').toDate();
            await Verification.create({ email: user.email, token, expiresAt });
            const verifyUrl = `${process.env.CLIENT_VERIFY_URL}?token=${token}`;
            try {
                await sendVerificationEmail(user.email, verifyUrl);
                res.status(201).json({ ok: true, message: 'Registriert. Bitte E-Mail prüfen.' });
            } catch (mailErr) {
                console.error('Failed to send verification email (SendGrid):', mailErr);
                res.status(201).json({
                    ok: true,
                    message: 'Registriert. E-Mail konnte nicht versendet werden. Bitte später erneut oder Support kontaktieren.'
                });
            }
        }
    );

    app.get('/api/auth/verify',
        query('token').isString().isLength({ min: 10 }),
        validate,
        async (req, res) => {
            const ver = await Verification.findOne({ token: req.query.token });
            if (!ver) return sendJSONError(res, 400, 'Ungültiger Token');
            if (dayjs(ver.expiresAt).isBefore(dayjs())) return sendJSONError(res, 400, 'Token abgelaufen');
            const user = await User.findOneAndUpdate({ email: ver.email }, { $set: { emailVerified: true } }, { new: true });
            if (!user) return sendJSONError(res, 400, 'Nutzer nicht gefunden');
            await Verification.deleteOne({ _id: ver._id });
            res.json({ ok: true });
        }
    );

    app.get('/api/serverstatus', async (req, res) => {
        res.status(200).json({ status: 'good' });
    });

    app.post('/api/auth/login',
        body('email').isEmail(),
        body('password').isString().isLength({ min: 8 }),
        validate,
        async (req, res) => {
            const { email, password } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) return sendJSONError(res, 401, 'Ungültige Zugangsdaten');
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return sendJSONError(res, 401, 'Ungültige Zugangsdaten');
            if (!user.emailVerified) return sendJSONError(res, 401, 'Bitte E-Mail zuerst verifizieren');
            const isBanned = await BannedUser.findOne({ userId: user._id }).lean();
            if (isBanned) return sendJSONError(res, 403, 'Dein Account ist gesperrt.');
            const token = jwt.sign({ sub: user._id, email: user.email }, jwtSecret, { expiresIn: '7d' });
            await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() } });
            res.json({ token });
        }
    );

    app.get('/api/auth/me', requireAuth, async (req, res) => {
        const user = await User.findById(req.user.sub).lean();
        if (!user) return sendJSONError(res, 404, 'Ungültiges Token.');
        res.json({
            id: user._id,
            email: user.email,
            isAdmin: !!user?.isAdmin,
            emailVerified: !!user?.emailVerified,
            enrKurs: user.enrKurs,
            wpuKurs1: user.wpuKurs1,
            wpuKurs2: user.wpuKurs2,
            theater: user.theater,
            doneSetup: !!user?.doneSetup
        });
    });

    app.patch('/api/user/setup',
        requireAuth,
        body('enrKurs').exists().withMessage('enrKurs ist erforderlich').isInt({ min: 0 }).toInt(),
        body('wpuKurs1').exists().withMessage('wpuKurs1 ist erforderlich').isInt({ min: 0 }).toInt(),
        body('wpuKurs2').exists().withMessage('wpuKurs2 ist erforderlich').isInt({ min: 0 }).toInt(),
        body('theater').exists().withMessage('Theater ist erforderlich').isInt({ min: 0 }).toInt(),
        validate,
        async (req, res) => {
            const { enrKurs, wpuKurs1, wpuKurs2, theater } = req.body;
            const userId = req.user.sub;
            const updateData = { enrKurs, wpuKurs1, wpuKurs2, theater, doneSetup: true };
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, fields: 'enrKurs wpuKurs1 wpuKurs2 theater doneSetup email isAdmin' }
            );
            if (!updatedUser) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
            await User.findByIdAndUpdate(userId, { $push: { activity: { at: new Date(), type: 'profile:setup:complete', meta: { enrKurs, wpuKurs1, wpuKurs2, theater } } } });
            res.json({
                ok: true,
                user: {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    isAdmin: updatedUser.isAdmin,
                    enrKurs: updatedUser.enrKurs,
                    wpuKurs1: updatedUser.wpuKurs1,
                    wpuKurs2: updatedUser.wpuKurs2,
                    theater: updatedUser.theater,
                    doneSetup: updatedUser.doneSetup
                }
            });
        }
    );

    app.get('/api/admin/users', requireAdmin, async (req, res) => {
        const users = await User.find({}).sort({ createdAt: -1 }).lean();
        res.json(users.map(u => ({
            id: u._id, email: u.email, isAdmin: u.isAdmin,
            createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
            activity: u.activity?.slice(-20) || []
        })));
    });

    app.delete('/api/admin/reports/:id', requireAdmin, param('id').isMongoId(), validate, async (req, res) => {
        try {
            const { id } = req.params;
            const deletedReport = await Report.findByIdAndDelete(id);
            if (!deletedReport) return sendJSONError(res, 404, 'Meldung nicht gefunden');

            await User.findByIdAndUpdate(req.user.sub, {
                $push: {
                    activity: {
                        at: new Date(),
                        type: 'admin:report:delete',
                        meta: { reportId: id }
                    }
                }
            });

            res.json({ ok: true, message: 'Meldung erfolgreich gelöscht' });
        } catch (err) {
            console.error('DELETE /api/admin/reports/:id error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });

    app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
        await User.deleteOne({ _id: req.params.id });
        await Item.deleteMany({ createdBy: req.params.id });
        res.json({ ok: true });
    });

    app.patch('/api/admin/users/:id', requireAdmin, body('isAdmin').isBoolean(), validate, async (req, res) => {
        await User.findByIdAndUpdate(req.params.id, { $set: { isAdmin: !!req.body.isAdmin } });
        res.json({ ok: true });
    });

    app.get('/api/subjects', async (req, res) => {
        const list = await Subject.find({}).sort({ name: 1 }).lean();
        res.json(list.map(s => s.name));
    });

    app.post('/api/admin/subjects', requireAdmin, body('name').isString().isLength({ min: 2, max: 50 }), validate, async (req, res) => {
        await Subject.updateOne({ name: req.body.name }, { $set: { name: req.body.name } }, { upsert: true });
        res.status(201).json({ ok: true });
    });

    app.delete('/api/admin/subjects/:name', requireAdmin, async (req, res) => {
        await Subject.deleteOne({ name: req.params.name });
        res.json({ ok: true });
    });

    app.get('/api/announcements', async (req, res) => {
        const list = await Announcement.find({}).sort({ createdAt: -1 }).limit(5).lean();
        res.json(list);
    });

    app.post('/api/announcements', requireAuth,
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
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'announcement:create', meta: { id: doc._id } } } });
            res.status(201).json(doc);
        }
    );

    app.delete('/api/announcements/:id', requireAuth, async (req, res) => {
        const ann = await Announcement.findById(req.params.id);
        if (!ann) return sendJSONError(res, 404, 'Nicht gefunden');
        const user = await User.findById(req.user.sub);
        if (!user?.isAdmin && ann.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');
        await ann.deleteOne();
        await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'announcement:delete', meta: { id: ann._id } } } });
        res.json({ ok: true });
    });

    app.post('/api/uploads/sign', requireAuth, async (req, res) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = cloudinary.utils.api_sign_request(
            { timestamp, folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben' },
            process.env.CLOUDINARY_API_SECRET
        );
        res.json({
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            timestamp,
            signature,
            folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben'
        });
    });

    app.post('/anon/sorgenbox', async (req, res) => {
        try {
            const { message } = req.body;
            if (!message || message.trim().length === 0) return res.status(400).json({ error: 'Message fehlt' });
            await Sorgen.create({ message, createdAt: new Date() });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: 'Serverfehler' });
        }
    });

    app.get('/api/admin/all-users', requireAdmin, async (req, res) => {
        try {
            const users = await User.find({}).select('-passwordHash -activity').sort({ createdAt: -1 }).lean();
            const bannedDocs = await BannedUser.find({}).select('userId').lean();
            const bannedIds = new Set(bannedDocs.map(b => b.userId.toString()));
            const usersWithSafeData = users.map(u => ({
                id: u._id,
                email: u.email,
                isAdmin: u.isAdmin,
                emailVerified: u.emailVerified,
                createdAt: u.createdAt,
                lastLoginAt: u.lastLoginAt,
                enrKurs: u.enrKurs,
                wpuKurs1: u.wpuKurs1,
                wpuKurs2: u.wpuKurs2,
                theater: u.theater,
                doneSetup: u.doneSetup,
                isBanned: bannedIds.has(u._id.toString())
            }));
            res.json(usersWithSafeData);
        } catch (err) {
            console.error('GET /api/admin/all-users error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.get('/api/admin/users/:id/activity', requireAdmin, async (req, res) => {
        try {
            const user = await User.findById(req.params.id).select('activity').lean();
            if (!user) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
            res.json(user.activity || []);
        } catch (err) {
            console.error('GET /api/admin/users/:id/activity error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.post('/api/items/:id/images',
        requireAuth,
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

    app.delete('/api/items/:itemId/images/:publicId',
        requireAuth,
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
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:image:delete', meta: { itemId: item._id, publicId: image.publicId } } } });
            res.json({ ok: true });
        }
    );

    app.get('/api/items',
        query('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']),
        query('filter').optional().isIn(['old']),
        validate,
        async (req, res) => {
            try {
                const cutOffDate = dayjs().subtract(48, 'hour').toDate();
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

    app.post('/api/items',
        requireAuth,
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
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:create', meta: { id: doc._id, type: doc.type } } } });
            res.status(201).json({ ok: true, id: doc._id });
        }
    );

    app.patch('/api/items/:id',
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

    app.delete('/api/items/:id', requireAuth, async (req, res) => {
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
        await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:delete', meta: { id: item._id } } } });
        res.json({ ok: true });
    });

    app.get('/api/checks/me', requireAuth, async (req, res) => {
        try {
            const docs = await KeepChecked.find({ userId: req.user.sub }).select('itemId -_id').lean();
            const itemIds = docs.map(d => d.itemId.toString());
            res.json({ itemIds });
        } catch (err) {
            console.error('checks/me error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.post('/api/items/:id/check', requireAuth, param('id').isMongoId(), validate, async (req, res) => {
        try {
            const item = await Item.findById(req.params.id);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            await KeepChecked.updateOne(
                { itemId: item._id, userId: req.user.sub },
                { $setOnInsert: { checkedAt: new Date() } },
                { upsert: true }
            );
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:check', meta: { itemId: item._id } } } });
            res.json({ ok: true });
        } catch (err) {
            console.error('check post error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.delete('/api/items/:id/check', requireAuth, param('id').isMongoId(), validate, async (req, res) => {
        try {
            await KeepChecked.deleteOne({ itemId: req.params.id, userId: req.user.sub });
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:uncheck', meta: { itemId: req.params.id } } } });
            res.json({ ok: true });
        } catch (err) {
            console.error('check delete error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.delete('/api/auth/me', requireAuth, async (req, res) => {
        try {
            const user = await User.findById(req.user.sub);
            if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
            if (user.isAdmin) return sendJSONError(res, 403, 'Admins können ihren Account nicht löschen');
            await User.deleteOne({ _id: user._id });
            await User.findByIdAndUpdate(user._id, { $push: { activity: { at: new Date(), type: 'account:delete', meta: { by: user._id } } } });
            res.json({ ok: true });
        } catch (err) {
            console.error('DELETE /api/auth/me error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.post('/api/admin/users/:id/ban', requireAdmin, param('id').isMongoId(), validate, async (req, res) => {
        try {
            const userToBan = await User.findById(req.params.id).lean();
            if (!userToBan) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
            if (userToBan.isAdmin) return sendJSONError(res, 400, 'Du kannst keine Admins bannen.');
            await BannedUser.updateOne(
                { userId: userToBan._id },
                { $set: { bannedAt: new Date() } },
                { upsert: true }
            );
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'admin:ban:user', meta: { targetUserId: userToBan._id } } } });
            res.json({ ok: true, isBanned: true });
        } catch (err) {
            console.error('POST /api/admin/users/:id/ban error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.delete('/api/admin/users/:id/ban', requireAdmin, param('id').isMongoId(), validate, async (req, res) => {
        try {
            const userId = req.params.id;
            await BannedUser.deleteOne({ userId: userId });
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'admin:unban:user', meta: { targetUserId: userId } } } });
            res.json({ ok: true, isBanned: false });
        } catch (err) {
            console.error('DELETE /api/admin/users/:id/ban error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.post('/api/auth/forgot', body('email').isEmail(), validate, async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const user = await User.findOne({ email });
            if (!user) return res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = dayjs().add(30, 'minute').toDate();
            await PasswordReset.updateMany({ email }, { $set: { used: true } });
            await PasswordReset.create({ email, code, expiresAt, used: false });
            try { await sendPasswordResetEmail(email, code); } catch (mailErr) { console.error('Send reset email failed', mailErr?.response?.body || mailErr?.message || mailErr); }
            res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
        } catch (err) {
            console.error('POST /api/auth/forgot error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.post('/api/auth/reset/verify',
        body('email').isEmail(),
        body('code').isString().isLength({ min: 6, max: 6 }),
        validate,
        async (req, res) => {
            try {
                const email = req.body.email.toLowerCase();
                const code = String(req.body.code).trim();
                const pr = await PasswordReset.findOne({ email, code, used: false }).sort({ createdAt: -1 });
                if (!pr) return sendJSONError(res, 400, 'Ungültiger Code');
                if (dayjs(pr.expiresAt).isBefore(dayjs())) return sendJSONError(res, 400, 'Code abgelaufen');
                pr.used = true;
                await pr.save();
                const resetToken = jwt.sign({ email, purpose: 'password_reset' }, jwtSecret, { expiresIn: '15m' });
                res.json({ ok: true, resetToken });
            } catch (err) {
                console.error('POST /api/auth/reset/verify error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    app.post('/api/auth/reset',
        body('resetToken').isString(),
        body('password').isString().isLength({ min: 8 }),
        validate,
        async (req, res) => {
            try {
                const { resetToken, password } = req.body;
                let payload;
                try { payload = jwt.verify(resetToken, jwtSecret); } catch { return sendJSONError(res, 400, 'Ungültiger oder abgelaufener Reset-Token'); }
                if (payload?.purpose !== 'password_reset' || !payload?.email) return sendJSONError(res, 400, 'Ungültiger Reset-Token');
                const email = String(payload.email).toLowerCase();
                const user = await User.findOne({ email });
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                const passwordHash = await bcrypt.hash(password, 12);
                await User.findByIdAndUpdate(user._id, { $set: { passwordHash } });
                await User.findByIdAndUpdate(user._id, { $push: { activity: { at: new Date(), type: 'account:password_reset', meta: { by: 'self' } } } });
                res.json({ ok: true, message: 'Passwort wurde geändert.' });
            } catch (err) {
                console.error('POST /api/auth/reset error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    app.post('/api/admin/security-report', requireAdmin, async (req, res) => {
        try {
            const { data, error: dbError } = await supabase
                .from('auth_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(500);

            if (dbError) {
                console.error('Supabase DB Error:', dbError);
                return sendJSONError(res, 500, 'Fehler beim Abrufen der Logs von Supabase.');
            }
            if (!data || data.length === 0) return sendJSONError(res, 404, 'Keine Auth-Logs gefunden.');

            const logsJsonString = JSON.stringify(data, null, 2);
            const truncatedLogs = logsJsonString.length > 50000
                ? logsJsonString.substring(0, 50000) + "\n... (Daten zur Anzeige gekürzt)"
                : logsJsonString;

            const prompt = `
Du bist ein leitender Cyber-Sicherheitsanalyst für eine Web-Anwendung.
Deine Aufgabe ist es, einen Sicherheitsbericht basierend auf den folgenden 500 Authentifizierungs-Logs (Tabelle 'auth_logs') zu erstellen.
Die Logs enthalten Felder wie 'ip', 'status' (success/failure), 'attempt_hash'(dies ist ein Hash des eingegebenen passworts), 'user_agent' und 'timestamp'.

Hier sind die Rohdaten (möglicherweise gekürzt):
${truncatedLogs}

---
AUFGABE:
Erstelle einen detaillierten, aber prägnanten Sicherheitsbericht auf Deutsch.
Struktur:
1.  **Zusammenfassung:** Kurze Übersicht (z.B. "Sicherheitslage stabil", "Auffälligkeiten erkannt").
2.  **Trendanalyse:** Gibt es Muster? (z.B. Uhrzeiten von Angriffen, Zunahme von 'failure'-Logs, auffällige User-Agents).
3.  **Auffällige Aktivitäten & IPs:** Identifiziere spezifische Bedrohungen.
    * Gibt es IPs mit extrem vielen 'failure'-Logs (Brute-Force-Versuche)? Liste die Top 3 verdächtigsten IPs auf.
    * Gibt es IPs mit vielen verschiedenen User-Agents?
    * Gibt es verdächtige 'success'-Logs nach vielen 'failure'-Logs von derselben IP (möglicher erfolgreicher Einbruch)?
4.  **Empfohlene Maßnahmen:** Konkrete, priorisierte Tipps. (z.B. "IP 1.2.3.4 auf Firewall blockieren", "Rate-Limiting für Login-Endpunkt /api/dashboard-check verschärfen").
5.  **Sicherheitswarnungen:** (Nur falls akute, offensichtliche Bedrohungen wie ein erfolgreicher Einbruch klar erkennbar sind).

Formatiere die gesamte Ausgabe als sauberes Markdown. Beginne direkt mit der ersten Überschrift (z.B. "## Zusammenfassung").
Hinweis: Es handelt sich bei der Authentifizierung nicht um eine klassische mit Benutzerkonten o. Ä., sondern um eine äußere Authentifizierung einer Seite. Die Website ist also nur für bestimmte autorisierte Personen, die von den Administratoren das allgemeine Passwort erhalten haben. Es gibt also nicht mehrere Accounts, sondern nur ein Passwort, das eingegeben werden muss, um durch die Authentifizierung zu kommen. Die Attempt Hashes sind dabei hashes der versuchten Passwörter.
      `;

            if (!geminiModel) {
                return sendJSONError(res, 500, 'Gemini API Key ist ungültig oder nicht initialisiert.');
            }

            const result = await geminiModel.generateContent(prompt);
            const response = result.response;
            const reportText = response.text();
            res.json({ ok: true, report: reportText });

        } catch (err) {
            console.error('Fehler beim Generieren des Sicherheitsberichts:', err);
            if (err.message && err.message.includes('API key not valid')) {
                return sendJSONError(res, 500, 'Gemini API Key ist ungültig.');
            }
            sendJSONError(res, 500, 'Fehler bei der Kommunikation mit der Gemini API.');
        }
    });

    app.post('/api/reports',
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
                    await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:report', meta: { itemId, reason: !!reason } } } });
                }
                res.status(201).json({ ok: true, message: 'Eintrag erfolgreich gemeldet.' });
            } catch (err) {
                console.error('POST /api/reports error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    app.get('/api/admin/reports', requireAdmin, async (req, res) => {
        try {
            const reports = await Report.find({}).sort({ reportedAt: -1 }).limit(100).lean();
            res.json(reports);
        } catch (err) {
            console.error('GET /api/admin/reports error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.get('/anon/sorgenfind', requireAdmin, async (req, res) => {
        try {
            const sorgen = await Sorgen.find({}).sort({ createdAt: -1 }).limit(100);
            res.json(sorgen);
        } catch (err) {
            console.error('GET /anon/sorgenfind error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });

    app.delete('/anon/sorgenfind/:id', requireAdmin, param('id').isMongoId(), validate, async (req, res) => {
        try {
            const { id } = req.params;
            const deletedSorge = await Sorgen.findByIdAndDelete(id);
            if (!deletedSorge) return sendJSONError(res, 404, 'Sorgen-Eintrag nicht gefunden');
            res.json({ ok: true, message: 'Sorgen-Eintrag erfolgreich gelöscht' });
        } catch (err) {
            console.error('DELETE /anon/sorgenfind/:id error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });

    app.get('/api/protected', (req, res, next) => {
        const header = req.headers.authorization;
        if (!header) return sendJSONError(res, 401, 'Kein Token');
        const token = header.split(' ')[1];
        try {
            const decoded = jwt.verify(token, jwtSecret);
            (async () => {
                const isBanned = await BannedUser.findOne({ userId: decoded.sub }).lean();
                if (isBanned) return sendJSONError(res, 401, 'Dein Account ist gesperrt.');
                res.json({ ok: true, message: 'Geheimer Kram' });
            })();
        } catch {
            return sendJSONError(res, 401, 'Ungültiges Token');
        }
    });

    app.post('/api/dashboard-check',
        dashboardLimiter,
        body('password').isString().isLength({ min: 1 }),
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { password } = req.body;
            const DASHBOARD_SECRETJ = dashboardSecret;
            const attemptHash = crypto.createHash('sha256').update(password).digest('hex');
            let status = 'failure';
            if (password === DASHBOARD_SECRETJ) {
                status = 'success';
                const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '30d' });
                await supabase.from('auth_logs').insert({ ip, status, attempt_hash: attemptHash, user_agent: ua });
                return res.json({ ok: true, token });
            } else {
                await supabase.from('auth_logs').insert({ ip, status, attempt_hash: attemptHash, user_agent: ua });
                return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
            }
        }
    );

    app.get('/api/verifyall', (req, res) => {
        const header = req.headers.authorization;
        if (!header) return sendJSONError(res, 401, 'Kein Token');
        const token = header.split(' ')[1];
        try {
            const decoded = jwt.verify(token, jwtSecret);
            (async () => {
                const isBanned = await BannedUser.findOne({ userId: decoded.sub }).lean();
                if (isBanned) return sendJSONError(res, 401, 'Dein Account ist gesperrt.');
                res.json({ ok: true });
            })();
        } catch {
            return sendJSONError(res, 401, 'Ungültiges Token');
        }
    });

    app.get('/api/todos', requireAuth, async (req, res) => {
        try {
            const todos = await EncryptedTodo.find({ userId: req.user.sub })
                .sort({ createdAt: -1 })
                .lean();

            // Entschlüssle die Daten
            const decryptedTodos = todos.map(todo => ({
                id: todo._id,
                title: decryptData(todo.encryptedTitle),
                content: decryptData(todo.encryptedContent),
                dueDate: todo.encryptedDueDate ? decryptData(todo.encryptedDueDate) : null,
                completed: todo.completed,
                createdAt: todo.createdAt,
                updatedAt: todo.updatedAt
            }));

            res.json(decryptedTodos);
        } catch (error) {
            console.error('Fehler beim Laden der To-Dos:', error);
            sendJSONError(res, 500, 'Fehler beim Laden der To-Dos');
        }
    });

    app.post('/api/todos',
        requireAuth,
        [
            body('title').isString().isLength({ min: 1, max: 100 }),
            body('content').optional().isString().isLength({ max: 1000 }),
            body('dueDate').optional().isISO8601()
        ],
        validate,
        async (req, res) => {
            try {
                const { title, content, dueDate } = req.body;

                const todo = await EncryptedTodo.create({
                    userId: req.user.sub,
                    encryptedTitle: encryptData(title),
                    encryptedContent: encryptData(content || ''),
                    encryptedDueDate: dueDate ? encryptData(dueDate) : null,
                    completed: false
                });

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'todo:create',
                            meta: { todoId: todo._id }
                        }
                    }
                });

                res.status(201).json({
                    id: todo._id,
                    title,
                    content: content || '',
                    dueDate: dueDate || null,
                    completed: false,
                    createdAt: todo.createdAt,
                    updatedAt: todo.updatedAt
                });
            } catch (error) {
                console.error('Fehler beim Erstellen des To-Dos:', error);
                sendJSONError(res, 500, 'Fehler beim Erstellen des To-Dos');
            }
        }
    );

    app.put('/api/todos/:id',
        requireAuth,
        [
            param('id').isMongoId(),
            body('title').isString().isLength({ min: 1, max: 100 }),
            body('content').optional().isString().isLength({ max: 1000 }),
            body('dueDate').optional().isISO8601()
        ],
        validate,
        async (req, res) => {
            try {
                const todo = await EncryptedTodo.findOne({
                    _id: req.params.id,
                    userId: req.user.sub
                });

                if (!todo) {
                    return sendJSONError(res, 404, 'To-Do nicht gefunden');
                }

                const { title, content, dueDate } = req.body;

                todo.encryptedTitle = encryptData(title);
                todo.encryptedContent = encryptData(content || '');
                todo.encryptedDueDate = dueDate ? encryptData(dueDate) : null;
                await todo.save();

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'todo:update',
                            meta: { todoId: todo._id }
                        }
                    }
                });

                res.json({
                    id: todo._id,
                    title,
                    content: content || '',
                    dueDate: dueDate || null,
                    completed: todo.completed,
                    createdAt: todo.createdAt,
                    updatedAt: todo.updatedAt
                });
            } catch (error) {
                console.error('Fehler beim Aktualisieren des To-Dos:', error);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren des To-Dos');
            }
        }
    );

    app.patch('/api/todos/:id/toggle',
        requireAuth,
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const todo = await EncryptedTodo.findOne({
                    _id: req.params.id,
                    userId: req.user.sub
                });

                if (!todo) {
                    return sendJSONError(res, 404, 'To-Do nicht gefunden');
                }

                todo.completed = !todo.completed;
                await todo.save();

                res.json({
                    completed: todo.completed
                });
            } catch (error) {
                console.error('Fehler beim Umschalten des To-Do-Status:', error);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren des To-Dos');
            }
        }
    );

    app.delete('/api/todos/:id',
        requireAuth,
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const todo = await EncryptedTodo.findOneAndDelete({
                    _id: req.params.id,
                    userId: req.user.sub
                });

                if (!todo) {
                    return sendJSONError(res, 404, 'To-Do nicht gefunden');
                }

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'todo:delete',
                            meta: { todoId: req.params.id }
                        }
                    }
                });

                res.json({ ok: true });
            } catch (error) {
                console.error('Fehler beim Löschen des To-Dos:', error);
                sendJSONError(res, 500, 'Fehler beim Löschen des To-Dos');
            }
        }
    );

    function encryptData(data) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key', 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key);
        cipher.setAAD(Buffer.from('todo-encryption'));

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            iv: iv.toString('hex'),
            data: encrypted,
            authTag: authTag.toString('hex')
        };
    }

    function decryptData(encryptedData) {
        try {
            const algorithm = 'aes-256-gcm';
            const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key', 'salt', 32);

            const decipher = crypto.createDecipher(algorithm, key);
            decipher.setAAD(Buffer.from('todo-encryption'));
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

            let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Fehler beim Entschlüsseln:', error);
            throw new Error('Daten konnten nicht entschlüsselt werden');
        }
    }

}
