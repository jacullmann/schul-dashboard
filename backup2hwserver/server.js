import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import sgClient from '@sendgrid/mail';
import { GoogleGenerativeAI } from "@google/generative-ai";
import routes from './routes.js';
import { initModels, ensureSubjects } from './models.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CORS_ORIGIN || 'https://schul-dashboard.com';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM = process.env.SENDGRID_FROM || process.env.SMTP_FROM || 'no-reply@yourdomain.com';
if (SENDGRID_API_KEY) {
    sgClient.setApiKey(SENDGRID_API_KEY);
    (async () => {
        try {
            await sgClient.request({ method: 'GET', url: '/v3/user/profile' });
            console.log('SendGrid API erreichbar und konfiguriert.');
        } catch (err) {
            console.error('SendGrid API Test fehlgeschlagen:', err?.response?.body || err?.message || err);
        }
    })();
} else {
    console.error('WARN: SENDGRID_API_KEY nicht gesetzt. E-Mails können nicht versendet werden.');
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let geminiModel = null;
try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
} catch (e) {
    console.warn('Warn: Gemini initialisierung fehlgeschlagen oder kein API Key vorhanden.');
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: 'https://schul-dashboard.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}));
app.options('*', cors({
    origin: CLIENT_ORIGIN,
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
}));

if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI nicht gesetzt. Beenden.');
    process.exit(1);
}
if (!process.env.APP_GATE_JWT_SECRET || !process.env.USER_JWT_SECRET || !process.env.CSRF_SECRET || !process.env.PASSWORD_RESET_SECRET) {
    console.error('FEHLER: APP_GATE_JWT_SECRET, USER_JWT_SECRET, CSRF_SECRET und PASSWORD_RESET_SECRET müssen gesetzt sein!');
    process.exit(1);
}
if (!process.env.ENCRYPTION_KEY) {
    console.error('FEHLER: ENCRYPTION_KEY muss gesetzt sein!');
    process.exit(1);
}
if (!process.env.DASHBOARD_CHECK_PASSWORD_HASH) {
    console.error('FEHLER: DASHBOARD_CHECK_PASSWORD_HASH muss gesetzt sein!');
    process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
const models = initModels(mongoose);
await ensureSubjects(models.Subject);

routes(app, {
    mongoose,
    models,
    supabase,
    cloudinary,
    sgClient,
    geminiModel,
    sendgridConfigured: !!SENDGRID_API_KEY,
    sendgridFrom: SENDGRID_FROM,
    appGateSecret: process.env.APP_GATE_JWT_SECRET,
    userSecret: process.env.USER_JWT_SECRET,
    csrfSecret: process.env.CSRF_SECRET,
    passwordResetSecret: process.env.PASSWORD_RESET_SECRET
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Backend läuft nun auf:${PORT}`));