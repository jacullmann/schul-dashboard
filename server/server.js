import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, param, query, validationResult } from 'express-validator';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import useragent from 'useragent';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true }
});

// Config
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const LOG_IP_RAW = String(process.env.LOG_IP_RAW || 'false') === 'true';

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Rate limit
const createLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', createLimiter);

// Mongo
await mongoose.connect(process.env.MONGODB_URI, { autoIndex: true });

// Utilities
const TITLES = ['Herr', 'Frau'];
const CATEGORIES = ['Freundlichkeit', 'Kompetenz', 'Puenktlichkeit', 'Fairness', 'Erklaeren', 'Organisation'];

function getClientIP(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || '';
}

function normalizeNameUpper(name) {
    return (name || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function hasBannedWord(text, bannedWords) {
    if (!text) return false;
    const str = String(text).toLowerCase();
    for (const w of bannedWords) {
        const word = String(w.word || w).toLowerCase().trim();
        if (!word) continue;
        // Whole word or substring? For moderation we use word-boundaries and also substring for obvious slurs
        const re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
        if (re.test(str) || str.includes(word)) return true;
    }
    return false;
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function computeOverall(categories) {
    // average of provided category values
    const vals = CATEGORIES.map(k => Number(categories[k])).filter(v => Number.isFinite(v));
    if (!vals.length) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Number((sum / vals.length).toFixed(2));
}

function parseUA(ua) {
    try {
        const a = useragent.parse(ua || '');
        return `${a.family} ${a.major || ''} on ${a.os?.family || ''}`;
    } catch {
        return ua || '';
    }
}

// Schemas
const PersonSchema = new mongoose.Schema({
    title: { type: String, enum: TITLES, required: true },
    nameUpper: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    stats: {
        ratingsCount: { type: Number, default: 0 },
        avgOverall: { type: Number, default: 0 },
        categoryAverages: {
            Freundlichkeit: { type: Number, default: 0 },
            Kompetenz: { type: Number, default: 0 },
            Puenktlichkeit: { type: Number, default: 0 },
            Fairness: { type: Number, default: 0 },
            Erklaeren: { type: Number, default: 0 },
            Organisation: { type: Number, default: 0 }
        }
    }
}, { timestamps: true });
PersonSchema.index({ title: 1, nameUpper: 1 }, { unique: true });

const RatingSchema = new mongoose.Schema({
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', index: true, required: true },
    categories: {
        Freundlichkeit: { type: Number, min: 1, max: 6, required: true },
        Kompetenz: { type: Number, min: 1, max: 6, required: true },
        Puenktlichkeit: { type: Number, min: 1, max: 6, required: true },
        Fairness: { type: Number, min: 1, max: 6, required: true },
        Erklaeren: { type: Number, min: 1, max: 6, required: true },
        Organisation: { type: Number, min: 1, max: 6, required: true }
    },
    overall: { type: Number, min: 1, max: 6, required: true },
    anonUserId: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', index: true, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    anonUserId: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const BannedWordSchema = new mongoose.Schema({
    word: { type: String, required: true, unique: true, trim: true }
}, { timestamps: true });

const AdminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
}, { timestamps: true });

const Person = mongoose.model('Person', PersonSchema);
const Rating = mongoose.model('Rating', RatingSchema);
const Message = mongoose.model('Message', MessageSchema);
const BannedWord = mongoose.model('BannedWord', BannedWordSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// Seed admin on startup
async function ensureAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const pw = process.env.ADMIN_PASSWORD;
    const pwh = process.env.ADMIN_PASSWORD_HASH;
    if (!email || (!pw && !pwh)) return;
    let admin = await Admin.findOne({ email });
    if (!admin) {
        const hash = pwh || await bcrypt.hash(pw, 12);
        admin = await Admin.create({ email, passwordHash: hash });
    }
}
await ensureAdmin();

// Auth middleware
function requireAdmin(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.admin = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

// Validation helpers
const validateCategories = [
    ...CATEGORIES.map(k => body(`categories.${k}`).isInt({ min: 1, max: 6 }).withMessage(`${k} 1-6`))
];

// Aggregation
async function recomputePersonStats(personId) {
    const ratings = await Rating.find({ person: personId }).lean();
    const count = ratings.length;
    const catSums = Object.fromEntries(CATEGORIES.map(k => [k, 0]));
    for (const r of ratings) {
        for (const k of CATEGORIES) catSums[k] += Number(r.categories[k] || 0);
    }
    const catAvgs = Object.fromEntries(CATEGORIES.map(k => [k, count ? Number((catSums[k] / count).toFixed(2)) : 0]));
    const overall = count ? Number((
        CATEGORIES.map(k => catAvgs[k]).reduce((a, b) => a + b, 0) / CATEGORIES.length
    ).toFixed(2)) : 0;
    await Person.findByIdAndUpdate(personId, {
        $set: {
            'stats.ratingsCount': count,
            'stats.categoryAverages': catAvgs,
            'stats.avgOverall': overall
        }
    });
}

// Routes

// Admin login
app.post('/api/admin/login',
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ sub: admin._id, email }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token });
    }
);

// Create rating (auto-create/find person)
app.post('/api/ratings',
    body('title').isIn(TITLES),
    body('name').isString().isLength({ min: 2, max: 100 }),
    body('anonUserId').isString().isLength({ min: 6, max: 64 }),
    ...validateCategories,
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const banned = await BannedWord.find({}).lean();
        const { title } = req.body;
        const nameUpper = normalizeNameUpper(req.body.name);
        if (hasBannedWord(nameUpper, banned)) {
            return res.status(400).json({ error: 'Unangemessener Name' });
        }
        const categories = {};
        for (const k of CATEGORIES) categories[k] = Number(req.body.categories[k]);

        const overall = computeOverall(categories);

        let person = await Person.findOne({ title, nameUpper });
        if (!person) {
            person = await Person.create({ title, nameUpper });
        }

        const ipRaw = getClientIP(req);
        const ip = LOG_IP_RAW ? ipRaw : ''; // DSGVO: optional
        const agent = parseUA(req.headers['user-agent']);

        const rating = await Rating.create({
            person: person._id,
            categories,
            overall,
            anonUserId: req.body.anonUserId,
            ip,
            userAgent: agent
        });

        await recomputePersonStats(person._id);

        res.status(201).json({ ok: true, ratingId: rating._id });
    }
);

// List persons with search/filter/sort
app.get('/api/persons',
    query('q').optional().isString(),
    query('title').optional().isIn(TITLES),
    query('sort').optional().isIn(['name', 'avg', 'count']),
    async (req, res) => {
        const { q, title, sort = 'name' } = req.query;
        const filter = {};
        if (title) filter.title = title;
        if (q) filter.nameUpper = { $regex: escapeRegex(String(q).toUpperCase()), $options: 'i' };
        let sortObj = { nameUpper: 1 };
        if (sort === 'avg') sortObj = { 'stats.avgOverall': 1, nameUpper: 1 };
        if (sort === 'count') sortObj = { 'stats.ratingsCount': -1, nameUpper: 1 };
        const persons = await Person.find(filter).sort(sortObj).limit(200).lean();
        res.json(persons.map(p => ({
            id: p._id,
            title: p.title,
            nameUpper: p.nameUpper,
            ratingsCount: p.stats?.ratingsCount || 0,
            avgOverall: p.stats?.avgOverall || 0
        })));
    }
);

// Person detail with category averages
app.get('/api/persons/:id',
    param('id').isMongoId(),
    async (req, res) => {
        const p = await Person.findById(req.params.id).lean();
        if (!p) return res.status(404).json({ error: 'Not found' });
        res.json({
            id: p._id,
            title: p.title,
            nameUpper: p.nameUpper,
            ratingsCount: p.stats?.ratingsCount || 0,
            avgOverall: p.stats?.avgOverall || 0,
            categoryAverages: p.stats?.categoryAverages || {}
        });
    }
);

// Messages
app.get('/api/persons/:id/messages',
    param('id').isMongoId(),
    async (req, res) => {
        const msgs = await Message.find({ person: req.params.id })
            .sort({ pinned: -1, createdAt: -1 })
            .limit(200)
            .lean();
        res.json(msgs.map(m => ({
            id: m._id,
            content: m.content,
            anonUserId: m.anonUserId,
            isAdmin: m.isAdmin,
            pinned: m.pinned,
            createdAt: m.createdAt
        })));
    }
);

app.post('/api/persons/:id/messages',
    param('id').isMongoId(),
    body('content').isString().isLength({ min: 1, max: 2000 }),
    body('anonUserId').isString().isLength({ min: 6, max: 64 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const person = await Person.findById(req.params.id);
        if (!person) return res.status(404).json({ error: 'Not found' });

        const banned = await BannedWord.find({}).lean();
        if (hasBannedWord(req.body.content, banned)) {
            return res.status(400).json({ error: 'Unangemessener Inhalt' });
        }

        const ipRaw = getClientIP(req);
        const ip = LOG_IP_RAW ? ipRaw : '';
        const agent = parseUA(req.headers['user-agent']);

        const msg = await Message.create({
            person: person._id,
            content: req.body.content,
            anonUserId: req.body.anonUserId,
            isAdmin: false,
            pinned: false,
            ip,
            userAgent: agent
        });

        const payload = {
            id: msg._id.toString(),
            personId: person._id.toString(),
            content: msg.content,
            anonUserId: msg.anonUserId,
            isAdmin: msg.isAdmin,
            pinned: msg.pinned,
            createdAt: msg.createdAt
        };
        io.to(person._id.toString()).emit('message:new', payload);

        res.status(201).json({ ok: true, id: msg._id });
    }
);

// Admin: view ratings/messages with metadata
app.get('/api/admin/persons/:id/ratings', requireAdmin, async (req, res) => {
    const list = await Rating.find({ person: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json(list.map(r => ({
        id: r._id,
        categories: r.categories,
        overall: r.overall,
        anonUserId: r.anonUserId,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt
    })));
});

app.get('/api/admin/persons/:id/messages', requireAdmin, async (req, res) => {
    const list = await Message.find({ person: req.params.id }).sort({ pinned: -1, createdAt: -1 }).lean();
    res.json(list.map(m => ({
        id: m._id,
        content: m.content,
        anonUserId: m.anonUserId,
        isAdmin: m.isAdmin,
        pinned: m.pinned,
        ip: m.ip,
        userAgent: m.userAgent,
        createdAt: m.createdAt
    })));
});

// Admin: post as admin
app.post('/api/admin/persons/:id/messages', requireAdmin,
    param('id').isMongoId(),
    body('content').isString().isLength({ min: 1, max: 2000 }),
    async (req, res) => {
        const person = await Person.findById(req.params.id);
        if (!person) return res.status(404).json({ error: 'Not found' });
        const banned = await BannedWord.find({}).lean();
        if (hasBannedWord(req.body.content, banned)) {
            return res.status(400).json({ error: 'Unangemessener Inhalt' });
        }
        const msg = await Message.create({
            person: person._id,
            content: req.body.content,
            anonUserId: 'ADMIN',
            isAdmin: true,
            pinned: false
        });
        const payload = {
            id: msg._id.toString(),
            personId: person._id.toString(),
            content: msg.content,
            anonUserId: msg.anonUserId,
            isAdmin: msg.isAdmin,
            pinned: msg.pinned,
            createdAt: msg.createdAt
        };
        io.to(person._id.toString()).emit('message:new', payload);
        res.status(201).json({ ok: true, id: msg._id });
    }
);

// Admin: edit/pin/delete messages
app.patch('/api/admin/messages/:id', requireAdmin,
    body('content').optional().isString().isLength({ min: 1, max: 2000 }),
    body('pinned').optional().isBoolean(),
    async (req, res) => {
        const update = {};
        if (req.body.content !== undefined) {
            const banned = await BannedWord.find({}).lean();
            if (hasBannedWord(req.body.content, banned)) {
                return res.status(400).json({ error: 'Unangemessener Inhalt' });
            }
            update.content = req.body.content;
        }
        if (req.body.pinned !== undefined) update.pinned = !!req.body.pinned;
        const msg = await Message.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
        if (!msg) return res.status(404).json({ error: 'Not found' });
        io.to(msg.person.toString()).emit('message:update', {
            id: msg._id.toString(),
            content: msg.content,
            pinned: msg.pinned
        });
        res.json({ ok: true });
    }
);

app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    io.to(msg.person.toString()).emit('message:delete', { id: msg._id.toString() });
    res.json({ ok: true });
});

// Admin: edit/delete rating
app.patch('/api/admin/ratings/:id', requireAdmin,
    ...CATEGORIES.map(k => body(`categories.${k}`).optional().isInt({ min: 1, max: 6 })),
    async (req, res) => {
        const rating = await Rating.findById(req.params.id);
        if (!rating) return res.status(404).json({ error: 'Not found' });
        const cats = { ...rating.categories, ...(req.body.categories || {}) };
        for (const k of CATEGORIES) {
            const v = Number(cats[k]);
            if (!(v >= 1 && v <= 6)) return res.status(400).json({ error: `Invalid ${k}` });
        }
        rating.categories = cats;
        rating.overall = computeOverall(cats);
        await rating.save();
        await recomputePersonStats(rating.person);
        res.json({ ok: true });
    }
);

app.delete('/api/admin/ratings/:id', requireAdmin, async (req, res) => {
    const rating = await Rating.findByIdAndDelete(req.params.id);
    if (!rating) return res.status(404).json({ error: 'Not found' });
    await recomputePersonStats(rating.person);
    res.json({ ok: true });
});

// Admin: banlist
app.get('/api/admin/banlist', requireAdmin, async (req, res) => {
    const items = await BannedWord.find({}).sort({ word: 1 }).lean();
    res.json(items);
});

app.post('/api/admin/banlist', requireAdmin,
    body('word').isString().isLength({ min: 1, max: 100 }),
    async (req, res) => {
        const word = req.body.word.trim();
        await BannedWord.updateOne({ word }, { $set: { word } }, { upsert: true });
        res.status(201).json({ ok: true });
    }
);

app.delete('/api/admin/banlist/:word', requireAdmin, async (req, res) => {
    await BannedWord.deleteOne({ word: req.params.word });
    res.json({ ok: true });
});

// Socket.io
io.on('connection', (socket) => {
    socket.on('room:join', (personId) => {
        if (personId) socket.join(personId);
    });
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

server.listen(PORT, () => {
    console.log(`Server on :${PORT}`);
});
