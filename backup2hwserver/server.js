// server.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { setupRoutes } from './routes.js';
import { ensureSubjects } from './models.js';

// Config
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8090;

// Security & utils
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://schul-dashboards.onrender.com',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
}));

// Database connection
await mongoose.connect(process.env.MONGODB_URI);

// Ensure default subjects
await ensureSubjects();

// Setup all routes
setupRoutes(app);

// Health endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Hausaufgaben backend on :${PORT}`));