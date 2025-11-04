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
const PORT = process.env.PORT || 8090;
const CLIENT_ORIGIN = process.env.CORS_ORIGIN || 'https://schul-dashboards.onrender.com';

// Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SendGrid
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

// Gemini (Google Generative AI)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let geminiModel = null;
try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
} catch (e) {
    // If library instantiation fails we still want server to run; route will handle missing key.
    console.warn('Warn: Gemini initialisierung fehlgeschlagen oder kein API Key vorhanden.');
}

// Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Security & utils middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

// Mongo connection + init models
if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI nicht gesetzt. Beenden.');
    process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
const models = initModels(mongoose); // returns all models and helpers
await ensureSubjects(models.Subject);

// Mount routes (routes.js will register all endpoints)
routes(app, {
    mongoose,
    models,
    supabase,
    cloudinary,
    sgClient,
    geminiModel,
    sendgridConfigured: !!SENDGRID_API_KEY,
    sendgridFrom: SENDGRID_FROM,
    jwtSecret: process.env.JWT_SECRET,
    dashboardSecret: process.env.DASHBOARD_SECRETJ || null
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Hausaufgaben backend on :${PORT}`));
