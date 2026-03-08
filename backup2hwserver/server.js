import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { Resend } from 'resend';
import routes from './routes.js';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { registerDocSocket } from './routes/doc.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }
});
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Schul Dashboard <noreply@schul-dashboard.com>';
let resendClient = null;

if (RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
    (async () => {
        try {
            await resendClient.domains.list();
            console.log('Resend API erreichbar und konfiguriert.');
        } catch (err) {
            console.error('Resend API Test fehlgeschlagen:', err?.message || err);
        }
    })();
} else {
    console.error('WARN: RESEND_API_KEY nicht gesetzt. E-Mails können nicht versendet werden.');
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-tenant-id']
}));
app.options('*', cors({
    origin: process.env.CORS_ORIGIN,
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

if (!process.env.USER_JWT_SECRET || !process.env.PASSWORD_RESET_SECRET) {
    console.error('FEHLER: USER_JWT_SECRET und PASSWORD_RESET_SECRET müssen gesetzt sein!');
    process.exit(1);
}
if (!process.env.ENCRYPTION_KEY) {
    console.error('FEHLER: ENCRYPTION_KEY muss gesetzt sein!');
    process.exit(1);
}

routes(app, {
    supabase,
    cloudinary,
    resendClient,
    emailConfigured: !!RESEND_API_KEY,
    emailFrom: EMAIL_FROM,
    authSecret: process.env.USER_JWT_SECRET,
    passwordResetSecret: process.env.PASSWORD_RESET_SECRET
});

registerDocSocket(io, supabase, {
    authSecret: process.env.USER_JWT_SECRET
});

app.get('/health', (req, res) => res.json({ ok: true }));

httpServer.listen(PORT, () => console.log(`Backend läuft nun auf: ${PORT}`));