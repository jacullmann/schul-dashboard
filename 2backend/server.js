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
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { v2 as cloudinary } from 'cloudinary';

// Config
const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 8090;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const CLIENT_ORIGIN = process.env.CORS_ORIGIN || '*';

// Security & utils
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

// Mongo
await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected');

// Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Models
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpires: Date
});
const User = mongoose.model('User', userSchema);

const itemSchema = new mongoose.Schema({
    type: { type: String, enum: ['Hausaufgaben', 'Klassenarbeiten', 'Dalton-Auftrag'], required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: String,
    images: [{
        url: String,
        publicId: String
    }],
    dueDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', itemSchema);

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    color: { type: String, enum: ['info', 'warn', 'danger'], default: 'info' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model('Announcement', announcementSchema);

const logSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    details: Object,
    timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.model('Log', logSchema);

async function logActivity(userId, action, details) {
    if (process.env.NODE_ENV === 'production') {
        const log = new Log({ user: userId, action, details });
        await log.save();
    }
}

// Middleware
function sendJSONError(res, status, message) {
    res.status(status).json({ error: message });
}

function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if (!token) return sendJSONError(res, 401, 'Unauthorized');
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        res.clearCookie('token');
        sendJSONError(res, 401, 'Unauthorized');
    }
}

// Routes
// Authentication
app.post('/api/auth/register',
    body('email').isEmail().normalizeEmail().withMessage('Ungültige E-Mail'),
    body('password').isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = dayjs().add(1, 'day').toDate();
        try {
            const user = new User({ email, password: hashedPassword, verificationToken, verificationTokenExpires });
            await user.save();
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            const verifyLink = `${req.protocol}://${req.get('host')}/verify?token=${verificationToken}`;
            await transporter.sendMail({
                from: '"Hausaufgaben App" <no-reply@hausaufgaben.de>',
                to: email,
                subject: 'E-Mail-Bestätigung',
                html: `<p>Bitte klicke auf diesen Link, um deine E-Mail-Adresse zu bestätigen: <a href="${verifyLink}">${verifyLink}</a></p>`
            });
            await logActivity(user._id, 'user:register', {});
            res.json({ ok: true, message: 'Benutzer registriert. Bitte E-Mail bestätigen.' });
        } catch (e) {
            sendJSONError(res, 400, e.code === 11000 ? 'E-Mail bereits registriert' : 'Registrierung fehlgeschlagen');
        }
    }
);

app.get('/api/auth/verify', query('token').isHexadecimal().isLength({ min: 64, max: 64 }), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendJSONError(res, 400, 'Ungültiger Token');
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token, verificationTokenExpires: { $gt: Date.now() } });
    if (!user) return sendJSONError(res, 400, 'Token ungültig oder abgelaufen');
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    await logActivity(user._id, 'user:verify', {});
    res.json({ ok: true });
});

app.post('/api/auth/login',
    body('email').isEmail().normalizeEmail().withMessage('Ungültige E-Mail'),
    body('password').isString(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return sendJSONError(res, 400, 'E-Mail oder Passwort falsch');
        if (!user.isVerified) return sendJSONError(res, 400, 'Bitte E-Mail-Adresse bestätigen');
        const match = await bcrypt.compare(password, user.password);
        if (!match) return sendJSONError(res, 400, 'E-Mail oder Passwort falsch');
        const token = jwt.sign({ sub: user._id, isAdmin: user.isAdmin, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        await logActivity(user._id, 'user:login', {});
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000 }).json({ token, user: { email: user.email, isAdmin: user.isAdmin, _id: user._id } });
    }
);

app.get('/api/auth/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.user.sub, 'email isAdmin').lean();
    if (!user) return res.json({ user: null });
    res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token').json({ ok: true });
});

// Items
app.post('/api/items', requireAuth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
    const item = new Item({ ...req.body, createdBy: req.user.sub, createdAt: new Date() });
    await item.save();
    await logActivity(req.user.sub, 'item:create', { id: item._id });
    res.status(201).json(item);
});

// NEUE Optimierung: Nutze Cloudinary, um Vorschaubilder zu senden
app.get('/api/items', async (req, res) => {
    const items = await Item.find({}).sort({ dueDate: -1 }).lean();
    const optimizedItems = items.map(item => {
        const optimizedImages = item.images.map(img => {
            const optimizedUrl = cloudinary.url(img.publicId, {
                width: 400,
                height: 300,
                crop: "fill",
                gravity: "auto",
                quality: "auto:low"
            });
            return {
                ...img,
                url: optimizedUrl
            };
        });
        return {
            ...item,
            images: optimizedImages
        };
    });
    res.json(optimizedItems);
});

app.get('/api/items/:id', param('id').isMongoId(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
    const item = await Item.findById(req.params.id);
    if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
    res.json(item);
});

app.post('/api/items/:id/images', param('id').isMongoId(), requireAuth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
    const item = await Item.findById(req.params.id);
    if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
    if (item.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');
    const { image } = req.body;
    item.images.push(image);
    await item.save();
    res.status(201).json({ image });
});

app.delete('/api/items/:id/images/:publicId', param('id').isMongoId(), param('publicId').isString(), requireAuth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
    const item = await Item.findById(req.params.id);
    if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
    if (item.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');
    await cloudinary.uploader.destroy(req.params.publicId);
    item.images = item.images.filter(img => img.publicId !== req.params.publicId);
    await item.save();
    res.json({ ok: true });
});

app.patch('/api/items/:id', param('id').isMongoId(), requireAuth,
    body('dueDate').isISO8601().toDate().optional().withMessage('Ungültiges Datum'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
        const item = await Item.findById(req.params.id);
        if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
        const user = await User.findById(req.user.sub);
        if (!user?.isAdmin && item.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Forbidden');
        if (req.body.dueDate && dayjs(req.body.dueDate).isBefore(dayjs(), 'day')) return sendJSONError(res, 400, 'Abgabedatum muss in der Zukunft liegen');

        const update = {};
        for (const k of ['title', 'subject', 'description', 'images', 'dueDate']) {
            if (req.body[k] !== undefined) update[k] = req.body[k];
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

    // Delete all associated images from Cloudinary first
    if (item.images && item.images.length > 0) {
        const publicIds = item.images.map(img => img.publicId);
        await cloudinary.api.delete_resources(publicIds);
    }
    await Item.findByIdAndDelete(req.params.id);
    await logActivity(req.user.sub, 'item:delete', { id: req.params.id });
    res.json({ ok: true });
});

// Announcements
app.post('/api/announcements', requireAuth,
    body('title').isString().notEmpty(),
    body('content').isString().notEmpty(),
    body('color').isIn(['info', 'warn', 'danger']),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return sendJSONError(res, 400, errors.array()[0].msg);
        const user = await User.findById(req.user.sub);
        if (!user?.isAdmin) return sendJSONError(res, 403, 'Forbidden');
        const announcement = new Announcement({ ...req.body, createdBy: req.user.sub });
        await announcement.save();
        await logActivity(req.user.sub, 'announcement:create', { id: announcement._id });
        res.status(201).json(announcement);
    }
);

app.get('/api/announcements', async (req, res) => {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });
    res.json(announcements);
});

app.delete('/api/announcements/:id', requireAuth, async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return sendJSONError(res, 404, 'Nicht gefunden');
    const user = await User.findById(req.user.sub);
    if (!user?.isAdmin) return sendJSONError(res, 403, 'Forbidden');
    await Announcement.findByIdAndDelete(req.params.id);
    await logActivity(req.user.sub, 'announcement:delete', { id: req.params.id });
    res.json({ ok: true });
});

// Cloudinary
app.get('/api/cloudinary/sign', requireAuth, async (req, res) => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
        folder: 'hausaufgaben'
    }, process.env.CLOUDINARY_API_SECRET);
    res.json({
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder: 'hausaufgaben'
    });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
