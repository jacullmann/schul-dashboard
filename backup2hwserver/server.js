// server.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { ensureSubjects } from './models/Subject.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 8090;

// Security & utils (EXAKT wie vorher)
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'https://schul-dashboards.onrender.com', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

// Database connection
await mongoose.connect(process.env.MONGODB_URI);

// Ensure default subjects
await ensureSubjects();

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Hausaufgaben backend on :${PORT}`));