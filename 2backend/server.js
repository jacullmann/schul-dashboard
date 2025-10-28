// server.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { v2 as cloudinary } from 'cloudinary';
import sgClient from '@sendgrid/mail';

// Config
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8090;
const JWT_SECRET = process.env.JWT_SECRET || 'zwu3i4otuz178n5z87325t7uw4tukwhstfhgskhtgkhsketnshktui45ktksez';
const CLIENT_ORIGIN = process.env.CORS_ORIGIN || '*';

// SendGrid config
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM = process.env.SENDGRID_FROM || process.env.SMTP_FROM || 'no-reply@yourdomain.com';

if (!SENDGRID_API_KEY) {
    console.error('WARN: SENDGRID_API_KEY nicht gesetzt. E-Mails können nicht versendet werden.');
} else {
    sgClient.setApiKey(SENDGRID_API_KEY);
    (async () => {
        try {
            // leichter API-Check; liefert Fehler, falls Key ungültig oder Netzwerk gesperrt
            await sgClient.request({ method: 'GET', url: '/v3/user/profile' });
            console.log('SendGrid API erreichbar und konfiguriert.');
        } catch (err) {
            console.error('SendGrid API Test fehlgeschlagen:', err?.response?.body || err?.message || err);
        }
    })();
}

// Security & utils
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

// Mongo
await mongoose.connect(process.env.MONGODB_URI);

// Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Models
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    activity: [{
        at: { type: Date, default: Date.now },
        type: { type: String },
        meta: { type: mongoose.Schema.Types.Mixed }
    }]
}, { timestamps: true });
const User = mongoose.model('HwUser', UserSchema);

const VerificationSchema = new mongoose.Schema({
    email: { type: String, index: true },
    token: { type: String, unique: true },
    expiresAt: { type: Date }
}, { timestamps: true });
const Verification = mongoose.model('HwVerification', VerificationSchema);

const SubjectSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true }
}, { timestamps: true });
const Subject = mongoose.model('HwSubject', SubjectSchema);

const AnnouncementSchema = new mongoose.Schema({
    title: String,
    content: String,
    color: { type: String, default: 'warn' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser' }
}, { timestamps: true });
const Announcement = mongoose.model('HwAnnouncement', AnnouncementSchema);

const ItemSchema = new mongoose.Schema({
    type: { type: String, enum: ['HAUSAUFGABE', 'DALTON', 'PRUEFUNG'], index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    images: [{
        url: String,
        thumbUrl: String,
        publicId: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser' }
    }],
    dueDate: { type: Date, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true }
}, { timestamps: true });
const Item = mongoose.model('HwItem', ItemSchema);

const KeepCheckedSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwItem', index: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true, required: true },
    checkedAt: { type: Date, default: Date.now }
}, { timestamps: false });

KeepCheckedSchema.index({ itemId: 1, userId: 1 }, { unique: true });
const KeepChecked = mongoose.model('HwKeepChecked', KeepCheckedSchema);

// Default Subjects seed
const DEFAULT_SUBJECTS = [
    'Mathe', 'Deutsch', 'Englisch', 'Französisch', 'Erdkunde', 'Sport',
    'Biologie', 'Chemie', 'Physik', 'Ethik', 'Politik', 'Musik',
    'Enrichment', 'WPU', 'Theater', 'Latein'
];
async function ensureSubjects() {
    for (const s of DEFAULT_SUBJECTS) {
        await Subject.updateOne({ name: s }, { $set: { name: s } }, { upsert: true });
    }
}
await ensureSubjects();


function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return sendJSONError(res, 401, 'Kein Token');

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return sendJSONError(res, 401, 'Ungültiges Token');
    }
}

// Helpers
function sendJSONError(res, status, msg, errors) {
    return res.status(status).json({ error: msg, errors });
}
function requireAuth(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return sendJSONError(res, 401, 'Unauthorized');
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
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
function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendJSONError(res, 400, 'Validation error', errors.array());
    next();
}
function timeLeftColor(dueDate) {
    const now = dayjs();
    const due = dayjs(dueDate);
    const diffDays = due.diff(now, 'day', true);
    if (diffDays < 0) return 'expired';
    if (diffDays < 1) return 'danger';
    if (diffDays < 2) return 'warn';
    if (diffDays < 3) return 'normal';
    return 'ok';
}
function buildThumbUrl(secureUrl) {
    try {
        const u = new URL(secureUrl);
        const parts = u.pathname.split('/');
        const uploadIdx = parts.findIndex(p => p === 'upload');
        if (uploadIdx !== -1) {
            parts.splice(uploadIdx + 1, 0, 'f_auto,q_auto:low,w_240,h_240,c_fill');
            u.pathname = parts.join('/');
        }
        return u.toString();
    } catch {
        return secureUrl;
    }
}
function withThumb(img) {
    return {
        url: img.url,
        thumbUrl: img.thumbUrl || buildThumbUrl(img.url),
        publicId: img.publicId,
        createdBy: img.createdBy
    };
}
async function logActivity(userId, type, meta = {}) {
    await User.findByIdAndUpdate(userId, { $push: { activity: { at: new Date(), type, meta } } });
}

// SendGrid helper
async function sendVerificationEmail(to, verifyUrl) {
    if (!SENDGRID_API_KEY) throw new Error('SendGrid nicht konfiguriert');
    const msg = {
        to,
        from: SENDGRID_FROM,
        subject: 'Bitte E-Mail bestätigen',
        html: `<p>Hallo,</p><p>Bitte bestätige deine E-Mail durch Klick auf diesen Link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Der Link ist 48 Stunden gültig.</p>`
    };
    return sgClient.send(msg);
}

// Auth routes
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
        const token = jwt.sign({ sub: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() } });
        res.json({ token });
    }
);

app.get('/api/auth/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.user.sub).lean();
    res.json({ id: user._id, email: user.email, isAdmin: !!user?.isAdmin, emailVerified: !!user?.emailVerified });
});

// Admin routes
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    res.json(users.map(u => ({
        id: u._id, email: u.email, isAdmin: u.isAdmin,
        createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
        activity: u.activity?.slice(-20) || []
    })));
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

// Subjects
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

// Announcements
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
        await logActivity(req.user.sub, 'announcement:create', { id: doc._id });
        res.status(201).json(doc);
    }
);
app.delete('/api/announcements/:id', requireAuth, async (req, res) => {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return sendJSONError(res, 404, 'Nicht gefunden');
    const user = await User.findById(req.user.sub);
    if (!user?.isAdmin && ann.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');
    await ann.deleteOne();
    await logActivity(req.user.sub, 'announcement:delete', { id: ann._id });
    res.json({ ok: true });
});

// Cloudinary signed upload
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

// Add image to an item
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

// Delete an image from an item
app.delete('/api/items/:itemId/images/:publicId',
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

// Items list (now supporting 'old' filter for items older than 48 hours)
app.get('/api/items',
    query('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']),
    query('filter').optional().isIn(['old']), // NEU: Erlaube den 'filter=old' Parameter
    validate,
    async (req, res) => {
        // Die 48-Stunden-Schwelle
        const cutOffDate = dayjs().subtract(48, 'hour').toDate();

        let dateQuery = {};

        if (req.query.filter === 'old') {
            // 'Alte Einträge': Fälligkeitsdatum muss älter als 48 Stunden sein ($lt = less than)
            dateQuery = { dueDate: { $lt: cutOffDate } };
        } else {
            // Standard ('Neue Einträge' / Aktuell): Fälligkeitsdatum muss neuer oder gleich 48 Stunden sein ($gte = greater than or equal)
            dateQuery = { dueDate: { $gte: cutOffDate } };
        }

        const list = await Item.find({
            type: req.query.type,
            ...dateQuery // Wende den Datumsfilter an
        })
            .sort({ dueDate: req.query.filter === 'old' ? -1 : 1 }) // Optionale Sortierung: Alte Einträge absteigend, neue Einträge aufsteigend
            .limit(500)
            .lean();

        const normalized = list.map(i => {
            const imgs = (i.images || []).map(img => withThumb(img));
            return {
                id: i._id,
                type: i.type,
                title: i.title,
                subject: i.subject,
                description: i.description,
                images: imgs,
                dueDate: i.dueDate,
                createdBy: i.createdBy,
                timeColor: timeLeftColor(i.dueDate)
            };
        });

        res.json(normalized);
    }
);

// Create item
app.post('/api/items',
    authMiddleware,
    requireAuth,
    body('type').isIn(['HAUSAUFGABE', 'DALTON', 'PRUEFUNG']),
    body('title').isString().isLength({ min: 2, max: 60 }),
    body('subject').isString().isLength({ min: 2, max: 40 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('images').optional().isArray({ max: 15 }),
    body('dueDate').isISO8601().toDate(),
    validate,
    async (req, res) => {
        const now = dayjs();
        if (dayjs(req.body.dueDate).isBefore(now, 'day')) return sendJSONError(res, 400, 'Abgabedatum muss in der Zukunft liegen');
        const images = (req.body.images || []).map(img => ({
            url: img.url,
            thumbUrl: buildThumbUrl(img.url),
            publicId: img.publicId,
            createdBy: req.user.sub
        }));
        const doc = await Item.create({
            type: req.body.type,
            title: req.body.title,
            subject: req.body.subject,
            description: req.body.description || '',
            images,
            dueDate: req.body.dueDate,
            createdBy: req.user.sub
        });
        await logActivity(req.user.sub, 'item:create', { id: doc._id, type: doc.type });
        res.status(201).json({ ok: true, id: doc._id });
    }
);

// Update item (own or admin)
app.patch('/api/items/:id',
    requireAuth,
    param('id').isMongoId(),
    body('title').optional().isString().isLength({ min: 2, max: 60 }),
    body('subject').optional().isString().isLength({ min: 2, max: 40 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('images').optional().isArray({ max: 15 }),
    body('dueDate').optional().isISO8601().toDate(),
    validate,
    async (req, res) => {
        const item = await Item.findById(req.params.id);
        if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
        const user = await User.findById(req.user.sub);
        if (!user?.isAdmin && item.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');
        if (req.body.dueDate && dayjs(req.body.dueDate).isBefore(dayjs(), 'day')) return sendJSONError(res, 400, 'Abgabedatum muss in der Zukunft liegen');

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

// Delete item (own or admin)
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
    await logActivity(req.user.sub, 'item:delete', { id: item._id });
    res.json({ ok: true });
});

// New endpoints for "checked" state handling

// Get checked items for current user (returns array of itemId strings)
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

// Check (mark) an item for current user
app.post('/api/items/:id/check',
    requireAuth,
    param('id').isMongoId(),
    validate,
    async (req, res) => {
        try {
            const item = await Item.findById(req.params.id);
            if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
            // upsert single document (unique compound index prevents duplicates)
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

// Uncheck (remove) an item for current user
app.delete('/api/items/:id/check',
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

// Delete own account (admins not allowed to delete their own accounts)
app.delete('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
        if (user.isAdmin) return sendJSONError(res, 403, 'Admins können ihren Account nicht löschen');

        // Only delete the user document itself. Do not delete items, images or other records.
        await User.deleteOne({ _id: user._id });

        await logActivity(user._id, 'account:delete', { by: user._id });

        res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/auth/me error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Reset token model (6-stelliger Code)
const PasswordResetSchema = new mongoose.Schema({
    email: { type: String, index: true, required: true, lowercase: true, trim: true },
    code: { type: String, required: true }, // store as string, e.g. "123456"
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
}, { timestamps: true });
PasswordResetSchema.index({ email: 1, code: 1 });
const PasswordReset = mongoose.model('HwPasswordReset', PasswordResetSchema);

// helper: send reset email with 6-digit code
async function sendPasswordResetEmail(to, code) {
    if (!SENDGRID_API_KEY) throw new Error('SendGrid nicht konfiguriert');
    const msg = {
        to,
        from: SENDGRID_FROM,
        subject: 'Passwort zurücksetzen — Dein Bestätigungscode',
        html: `<p>Hallo,</p>
           <p>Dein Passwort-Zurücksetz-Code: <strong>${code}</strong></p>
           <p>Dieser Code ist 30 Minuten gültig.</p>`
    };
    return sgClient.send(msg);
}

// POST /api/auth/forgot
app.post('/api/auth/forgot',
    body('email').isEmail(),
    validate,
    async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const user = await User.findOne({ email });
            // respond success even if user not found (avoid user enumeration)
            if (!user) {
                return res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
            }

            // generate 6-digit numeric code
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = dayjs().add(30, 'minute').toDate();

            // store (invalidate previous codes for email)
            await PasswordReset.updateMany({ email }, { $set: { used: true } });
            await PasswordReset.create({ email, code, expiresAt, used: false });

            try {
                await sendPasswordResetEmail(email, code);
            } catch (mailErr) {
                console.error('Send reset email failed', mailErr?.response?.body || mailErr?.message || mailErr);
                // still return generic success message
            }

            res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
        } catch (err) {
            console.error('POST /api/auth/forgot error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

// POST /api/auth/reset/verify  -> input: { email, code }
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

            // mark as used so it cannot be reused
            pr.used = true;
            await pr.save();

            // create a short-lived JWT token to authorize the actual password change (valid 15 minutes)
            const resetToken = jwt.sign({ email, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });

            res.json({ ok: true, resetToken });
        } catch (err) {
            console.error('POST /api/auth/reset/verify error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

// POST /api/auth/reset  -> input: { resetToken, password }
app.post('/api/auth/reset',
    body('resetToken').isString(),
    body('password').isString().isLength({ min: 8 }),
    validate,
    async (req, res) => {
        try {
            const { resetToken, password } = req.body;
            let payload;
            try {
                payload = jwt.verify(resetToken, JWT_SECRET);
            } catch {
                return sendJSONError(res, 400, 'Ungültiger oder abgelaufener Reset-Token');
            }
            if (payload?.purpose !== 'password_reset' || !payload?.email) return sendJSONError(res, 400, 'Ungültiger Reset-Token');

            const email = String(payload.email).toLowerCase();
            const user = await User.findOne({ email });
            if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

            const passwordHash = await bcrypt.hash(password, 12);
            await User.findByIdAndUpdate(user._id, { $set: { passwordHash } });

            await logActivity(user._id, 'account:password_reset', { by: 'self' });

            res.json({ ok: true, message: 'Passwort wurde geändert.' });
        } catch (err) {
            console.error('POST /api/auth/reset error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);






/*app.post('/api/dashboard-check',
    body('password').isString().isLength({ min: 1 }),
    validate,
    async (req, res) => {

        const DASHBOARD_SECRETJ = process.env.DASHBOARD_SECRETJ;

        const { password } = req.body;

        if (password === DASHBOARD_SECRETJ) {

            return res.json({ ok: true, message: 'Authentifizierung erfolgreich' });
        } else {

            return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
        }
    }
);*/




app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({ ok: true, message: 'Geheimer Kram' });
});


app.post('/api/dashboard-check',
    body('password').isString().isLength({ min: 1 }),
    validate,
    async (req, res) => {

        const DASHBOARD_SECRETJ = process.env.DASHBOARD_SECRETJ;

        const { password } = req.body;

        if (password === DASHBOARD_SECRETJ) {
            const token = jwt.sign(
                { role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            return res.json({ ok: true, token });
        } else {
            return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
        }
    }
);

app.get('/api/verifyall', authMiddleware, (req, res) => {
    res.json({ ok: true });
});













// Health
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Hausaufgaben backend on :${PORT}`));